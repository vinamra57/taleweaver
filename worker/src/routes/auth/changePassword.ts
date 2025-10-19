/**
 * POST /api/auth/change-password
 * Change password for logged-in user
 */

import { Context } from 'hono';
import type { Env } from '../../types/env';
import { ChangePasswordRequestSchema } from '../../schemas/auth/user';
import { verifyPassword, hashPassword, validatePasswordStrength } from '../../auth/password';
import { requireAuthUser } from '../../auth/middleware';
import { ValidationError } from '../../utils/errors';
import { createLogger } from '../../utils/logger';

const logger = createLogger('Change Password Route');

export async function handleChangePassword(c: Context<{ Bindings: Env }>): Promise<Response> {
  try {
    const authUser = requireAuthUser(c);
    const body = await c.req.json();
    const validatedRequest = ChangePasswordRequestSchema.parse(body);

    logger.info('Password change attempt', { userId: authUser.id });

    // Validate new password strength
    const passwordValidation = validatePasswordStrength(validatedRequest.new_password);
    if (!passwordValidation.valid) {
      throw new ValidationError(passwordValidation.errors.join(', '));
    }

    // Get Durable Object instance
    const id = c.env.USER_DO.idFromName('users');
    const userDO = c.env.USER_DO.get(id);

    // Get user
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

    // Verify current password
    const passwordValid = await verifyPassword(
      validatedRequest.current_password,
      user.password_hash
    );

    if (!passwordValid) {
      logger.warn('Invalid current password', { userId: authUser.id });
      return c.json(
        {
          error: 'Invalid Password',
          message: 'Current password is incorrect',
        },
        401
      );
    }

    // Hash new password
    const newPasswordHash = await hashPassword(validatedRequest.new_password);

    // Update password
    await userDO.updateUser(user.id, {
      password_hash: newPasswordHash,
    });

    logger.info('Password changed successfully', { userId: user.id });

    return c.json({
      message: 'Password changed successfully',
    });
  } catch (error) {
    logger.error('Password change failed', error);

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
        error: 'Password Change Failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
}
