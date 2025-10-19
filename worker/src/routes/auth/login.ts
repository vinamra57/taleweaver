/**
 * POST /api/auth/login
 * Email/password login
 */

import { Context } from 'hono';
import type { Env } from '../../types/env';
import { LoginRequestSchema, type AuthResponse } from '../../schemas/auth/user';
import { verifyPassword } from '../../auth/password';
import { generateTokenPair } from '../../auth/jwt';
import { ValidationError } from '../../utils/errors';
import { createLogger } from '../../utils/logger';

const logger = createLogger('Login Route');

export async function handleLogin(c: Context<{ Bindings: Env }>): Promise<Response> {
  try {
    // Parse and validate request
    const body = await c.req.json();
    const validatedRequest = LoginRequestSchema.parse(body);

    logger.info('Login attempt', { email: validatedRequest.email });

    // Get Durable Object instance
    const id = c.env.USER_DO.idFromName('users');
    const userDO = c.env.USER_DO.get(id);

    // Get user by email
    const user = await userDO.getUserByEmail(validatedRequest.email);

    if (!user || !user.password_hash) {
      // Don't reveal whether email exists
      return c.json(
        {
          error: 'Invalid Credentials',
          message: 'Email or password is incorrect',
        },
        401
      );
    }

    // Verify password
    const passwordValid = await verifyPassword(validatedRequest.password, user.password_hash);

    if (!passwordValid) {
      logger.warn('Invalid password', { email: validatedRequest.email });
      return c.json(
        {
          error: 'Invalid Credentials',
          message: 'Email or password is incorrect',
        },
        401
      );
    }

    // Generate JWT tokens
    const { accessToken, refreshToken } = await generateTokenPair(
      user.id,
      user.email,
      c.env.JWT_SECRET
    );

    // Return response
    const response: AuthResponse = {
      user: {
        id: user.id,
        email: user.email,
        email_verified: user.email_verified,
        name: user.name,
        created_at: user.created_at,
        updated_at: user.updated_at,
      },
      access_token: accessToken,
      refresh_token: refreshToken,
    };

    logger.info('Login successful', { userId: user.id });
    return c.json(response, 200);
  } catch (error) {
    logger.error('Login failed', error);

    if (error instanceof ValidationError) {
      return c.json(
        {
          error: 'Validation Error',
          message: error.message,
        },
        400
      );
    }

    return c.json(
      {
        error: 'Login Failed',
        message: 'An error occurred during login',
      },
      500
    );
  }
}
