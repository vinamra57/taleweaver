/**
 * User Profile Routes
 * GET /api/user/me - Get current user
 * PATCH /api/user/me - Update user profile
 */

import { Context } from 'hono';
import type { Env } from '../../types/env';
import { requireAuthUser } from '../../auth/middleware';
import { z } from 'zod';
import { ValidationError } from '../../utils/errors';
import { createLogger } from '../../utils/logger';

const logger = createLogger('User Profile Routes');

const UpdateProfileRequestSchema = z.object({
  name: z.string().min(1).max(100).optional(),
});

/**
 * GET /api/user/me
 */
export async function handleGetMe(c: Context<{ Bindings: Env }>): Promise<Response> {
  try {
    const authUser = requireAuthUser(c);

    logger.info('Get current user', { userId: authUser.id });

    // Get Durable Object instance
    const id = c.env.USER_DO.idFromName('users');
    const userDO = c.env.USER_DO.get(id);

    const user = await userDO.getUserById(authUser.id);

    if (!user) {
      return c.json(
        {
          error: 'User Not Found',
          message: 'User not found',
        },
        404
      );
    }

    // Return user without password hash
    return c.json({
      user: {
        id: user.id,
        email: user.email,
        email_verified: user.email_verified,
        name: user.name,
        created_at: user.created_at,
        updated_at: user.updated_at,
      },
    });
  } catch (error) {
    logger.error('Get user failed', error);
    return c.json(
      {
        error: 'Failed to Get User',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
}

/**
 * PATCH /api/user/me
 */
export async function handleUpdateMe(c: Context<{ Bindings: Env }>): Promise<Response> {
  try {
    const authUser = requireAuthUser(c);
    const body = await c.req.json();
    const updates = UpdateProfileRequestSchema.parse(body);

    logger.info('Update user profile', { userId: authUser.id });

    // Get Durable Object instance
    const id = c.env.USER_DO.idFromName('users');
    const userDO = c.env.USER_DO.get(id);

    const user = await userDO.updateUser(authUser.id, updates);

    if (!user) {
      return c.json(
        {
          error: 'User Not Found',
          message: 'User not found',
        },
        404
      );
    }

    return c.json({
      user: {
        id: user.id,
        email: user.email,
        email_verified: user.email_verified,
        name: user.name,
        created_at: user.created_at,
        updated_at: user.updated_at,
      },
    });
  } catch (error) {
    logger.error('Update user failed', error);

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
        error: 'Update Failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
}
