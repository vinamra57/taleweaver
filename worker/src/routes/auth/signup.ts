/**
 * POST /api/auth/signup
 * Email/password registration
 */

import { Context } from 'hono';
import type { Env } from '../../types/env';
import {
  SignupRequestSchema,
  type AuthResponse,
  type User,
} from '../../schemas/auth/user';
import { hashPassword, validatePasswordStrength } from '../../auth/password';
import { generateTokenPair } from '../../auth/jwt';
import { generateUUID } from '../../utils/validation';
import { ValidationError } from '../../utils/errors';
import { createLogger } from '../../utils/logger';

const logger = createLogger('Signup Route');

export async function handleSignup(c: Context<{ Bindings: Env }>): Promise<Response> {
  try {
    // Parse and validate request
    const body = await c.req.json();
    const validatedRequest = SignupRequestSchema.parse(body);

    logger.info('New signup attempt', { email: validatedRequest.email });

    // Validate password strength
    const passwordValidation = validatePasswordStrength(validatedRequest.password);
    if (!passwordValidation.valid) {
      throw new ValidationError(passwordValidation.errors.join(', '));
    }

    // Get Durable Object instance
    const id = c.env.USER_DO.idFromName('users');
    const userDO = c.env.USER_DO.get(id);

    // Check if email already exists
    const existingUser = await userDO.getUserByEmail(validatedRequest.email);
    if (existingUser) {
      return c.json(
        {
          error: 'Email Already Exists',
          message: 'An account with this email already exists',
        },
        409
      );
    }

    // Hash password
    const passwordHash = await hashPassword(validatedRequest.password);

    // Create user
    const userId = generateUUID();
    const now = new Date().toISOString();

    const user: User = {
      id: userId,
      email: validatedRequest.email,
      password_hash: passwordHash,
      name: validatedRequest.name,
      created_at: now,
      updated_at: now,
    };

    await userDO.createUser(user);

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
        name: user.name,
        created_at: user.created_at,
        updated_at: user.updated_at,
      },
      access_token: accessToken,
      refresh_token: refreshToken,
    };

    logger.info('Signup successful', { userId });
    return c.json(response, 201);
  } catch (error) {
    logger.error('Signup failed', error);

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
        error: 'Signup Failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
}
