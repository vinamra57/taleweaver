/**
 * Child Profile Routes
 * GET /api/profiles - List child profiles
 * POST /api/profiles - Create child profile
 * GET /api/profiles/:id - Get specific profile
 * PATCH /api/profiles/:id - Update profile
 * DELETE /api/profiles/:id - Delete profile
 */

import { Context } from 'hono';
import type { Env } from '../../types/env';
import type { ChildProfile } from '../../schemas/auth/user';
import {
  CreateChildProfileRequestSchema,
  UpdateChildProfileRequestSchema,
} from '../../schemas/auth/user';
import { requireAuthUser } from '../../auth/middleware';
import { generateUUID } from '../../utils/validation';
import { ValidationError } from '../../utils/errors';
import { createLogger } from '../../utils/logger';

const logger = createLogger('Child Profile Routes');

/**
 * GET /api/profiles
 */
export async function handleListProfiles(c: Context<{ Bindings: Env }>): Promise<Response> {
  try {
    const authUser = requireAuthUser(c);

    logger.info('List child profiles', { userId: authUser.id });

    // Get Durable Object instance
    const id = c.env.USER_DO.idFromName('users');
    const userDO = c.env.USER_DO.get(id);

    const profiles = await userDO.getUserChildProfiles(authUser.id);

    return c.json({
      profiles,
    });
  } catch (error) {
    logger.error('List profiles failed', error);
    return c.json(
      {
        error: 'Failed to List Profiles',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
}

/**
 * POST /api/profiles
 */
export async function handleCreateProfile(c: Context<{ Bindings: Env }>): Promise<Response> {
  try {
    const authUser = requireAuthUser(c);
    const body = await c.req.json();
    const validatedRequest = CreateChildProfileRequestSchema.parse(body);

    logger.info('Create child profile', { userId: authUser.id });

    // Get Durable Object instance
    const id = c.env.USER_DO.idFromName('users');
    const userDO = c.env.USER_DO.get(id);

    const now = new Date().toISOString();
    const profile: ChildProfile = {
      id: generateUUID(),
      user_id: authUser.id,
      name: validatedRequest.name,
      gender: validatedRequest.gender,
      age_range: validatedRequest.age_range,
      interests: validatedRequest.interests,
      context: validatedRequest.context,
      created_at: now,
      updated_at: now,
    };

    await userDO.createChildProfile(profile);

    logger.info('Child profile created', { profileId: profile.id });

    return c.json({
      profile,
    }, 201);
  } catch (error) {
    logger.error('Create profile failed', error);

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
        error: 'Creation Failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
}

/**
 * GET /api/profiles/:id
 */
export async function handleGetProfile(c: Context<{ Bindings: Env }>): Promise<Response> {
  try {
    const authUser = requireAuthUser(c);
    const profileId = c.req.param('id');

    logger.info('Get child profile', { userId: authUser.id, profileId });

    // Get Durable Object instance
    const id = c.env.USER_DO.idFromName('users');
    const userDO = c.env.USER_DO.get(id);

    const profile = await userDO.getChildProfile(profileId);

    if (!profile) {
      return c.json(
        {
          error: 'Profile Not Found',
          message: 'Child profile not found',
        },
        404
      );
    }

    // Check ownership
    if (profile.user_id !== authUser.id) {
      return c.json(
        {
          error: 'Forbidden',
          message: 'You do not have access to this profile',
        },
        403
      );
    }

    return c.json({
      profile,
    });
  } catch (error) {
    logger.error('Get profile failed', error);
    return c.json(
      {
        error: 'Failed to Get Profile',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
}

/**
 * PATCH /api/profiles/:id
 */
export async function handleUpdateProfile(c: Context<{ Bindings: Env }>): Promise<Response> {
  try {
    const authUser = requireAuthUser(c);
    const profileId = c.req.param('id');
    const body = await c.req.json();
    const updates = UpdateChildProfileRequestSchema.parse(body);

    logger.info('Update child profile', { userId: authUser.id, profileId });

    // Get Durable Object instance
    const id = c.env.USER_DO.idFromName('users');
    const userDO = c.env.USER_DO.get(id);

    // Check ownership
    const existingProfile = await userDO.getChildProfile(profileId);
    if (!existingProfile) {
      return c.json(
        {
          error: 'Profile Not Found',
          message: 'Child profile not found',
        },
        404
      );
    }

    if (existingProfile.user_id !== authUser.id) {
      return c.json(
        {
          error: 'Forbidden',
          message: 'You do not have access to this profile',
        },
        403
      );
    }

    const profile = await userDO.updateChildProfile(profileId, updates);

    if (!profile) {
      return c.json(
        {
          error: 'Update Failed',
          message: 'Failed to update profile',
        },
        500
      );
    }

    logger.info('Child profile updated', { profileId });

    return c.json({
      profile,
    });
  } catch (error) {
    logger.error('Update profile failed', error);

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

/**
 * DELETE /api/profiles/:id
 */
export async function handleDeleteProfile(c: Context<{ Bindings: Env }>): Promise<Response> {
  try {
    const authUser = requireAuthUser(c);
    const profileId = c.req.param('id');

    logger.info('Delete child profile', { userId: authUser.id, profileId });

    // Get Durable Object instance
    const id = c.env.USER_DO.idFromName('users');
    const userDO = c.env.USER_DO.get(id);

    const success = await userDO.deleteChildProfile(profileId, authUser.id);

    if (!success) {
      return c.json(
        {
          error: 'Delete Failed',
          message: 'Profile not found or access denied',
        },
        404
      );
    }

    logger.info('Child profile deleted', { profileId });

    return c.json({
      message: 'Profile deleted successfully',
    });
  } catch (error) {
    logger.error('Delete profile failed', error);
    return c.json(
      {
        error: 'Delete Failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
}
