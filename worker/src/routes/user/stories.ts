/**
 * Story History Routes
 * GET /api/stories - List user's stories
 * GET /api/stories/:id - Get specific story
 * POST /api/stories/save - Save a story
 * DELETE /api/stories/:id - Delete story
 */

import { Context } from 'hono';
import type { Env } from '../../types/env';
import type { SavedStory } from '../../schemas/auth/user';
import { SaveStoryRequestSchema } from '../../schemas/auth/user';
import { requireAuthUser } from '../../auth/middleware';
import { getSession } from '../../services/kv';
import { generateUUID } from '../../utils/validation';
import { ValidationError } from '../../utils/errors';
import { createLogger } from '../../utils/logger';

const logger = createLogger('Story Routes');

/**
 * GET /api/stories
 */
export async function handleListStories(c: Context<{ Bindings: Env }>): Promise<Response> {
  try {
    const authUser = requireAuthUser(c);

    logger.info('List stories', { userId: authUser.id });

    // Get Durable Object instance
    const id = c.env.USER_DO.idFromName('users');
    const userDO = c.env.USER_DO.get(id) as any;

    const stories = await userDO.getUserStories(authUser.id);

    return c.json({
      stories,
    });
  } catch (error) {
    logger.error('List stories failed', error);
    return c.json(
      {
        error: 'Failed to List Stories',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
}

/**
 * GET /api/stories/:id
 */
export async function handleGetStory(c: Context<{ Bindings: Env }>): Promise<Response> {
  try {
    const authUser = requireAuthUser(c);
    const storyId = c.req.param('id');

    logger.info('Get story', { userId: authUser.id, storyId });

    // Get Durable Object instance
    const id = c.env.USER_DO.idFromName('users');
    const userDO = c.env.USER_DO.get(id) as any;

    const story = await userDO.getStory(storyId);

    if (!story) {
      return c.json(
        {
          error: 'Story Not Found',
          message: 'Story not found',
        },
        404
      );
    }

    // Check ownership
    if (story.user_id !== authUser.id) {
      return c.json(
        {
          error: 'Forbidden',
          message: 'You do not have access to this story',
        },
        403
      );
    }

    // Get session data from KV
    const session = await getSession(story.session_id, c.env);

    return c.json({
      story,
      session,
    });
  } catch (error) {
    logger.error('Get story failed', error);
    return c.json(
      {
        error: 'Failed to Get Story',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
}

/**
 * POST /api/stories/save
 */
export async function handleSaveStory(c: Context<{ Bindings: Env }>): Promise<Response> {
  try {
    // Step 1: Get auth user
    const authUser = requireAuthUser(c);
    logger.info('Auth user retrieved', { userId: authUser.id });

    // Step 2: Parse request body
    const body = await c.req.json();
    const validatedRequest = SaveStoryRequestSchema.parse(body);
    logger.info('Request validated', { sessionId: validatedRequest.session_id, title: validatedRequest.title });

    // Step 3: Get session from KV
    const session = await getSession(validatedRequest.session_id, c.env);

    if (!session) {
      logger.warn('Session not found in KV', { sessionId: validatedRequest.session_id });
      return c.json(
        {
          error: 'Session Not Found',
          message: 'Story session not found or expired. Sessions expire after 12 hours.',
        },
        404
      );
    }
    logger.info('Session found', { childName: session.child.name });

    // Step 4: Get Durable Object instance
    const id = c.env.USER_DO.idFromName('users');
    const userDO = c.env.USER_DO.get(id);
    logger.info('Durable Object retrieved');

    // Step 5: Create saved story object
    const now = new Date().toISOString();
    const savedStory: SavedStory = {
      id: generateUUID(),
      user_id: authUser.id,
      session_id: validatedRequest.session_id,
      title: validatedRequest.title,
      child_name: session.child.name,
      moral_focus: session.moral_focus,
      interactive: session.interactive,
      created_at: now,
      last_played_at: now,
    };
    logger.info('Story object created', { storyId: savedStory.id });

    // Step 6: Save to Durable Object
    await (userDO as any).saveStory(savedStory);
    logger.info('Story saved to DO successfully', { storyId: savedStory.id });

    return c.json({
      story: savedStory,
    }, 201);
  } catch (error) {
    logger.error('Save story failed', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });

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
        error: 'Save Failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
}

/**
 * DELETE /api/stories/:id
 */
export async function handleDeleteStory(c: Context<{ Bindings: Env }>): Promise<Response> {
  try {
    const authUser = requireAuthUser(c);
    const storyId = c.req.param('id');

    logger.info('Delete story', { userId: authUser.id, storyId });

    // Get Durable Object instance
    const id = c.env.USER_DO.idFromName('users');
    const userDO = c.env.USER_DO.get(id) as any;

    const success = await userDO.deleteStory(storyId, authUser.id);

    if (!success) {
      return c.json(
        {
          error: 'Delete Failed',
          message: 'Story not found or access denied',
        },
        404
      );
    }

    logger.info('Story deleted', { storyId });

    return c.json({
      message: 'Story deleted successfully',
    });
  } catch (error) {
    logger.error('Delete story failed', error);
    return c.json(
      {
        error: 'Delete Failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
}
