/**
 * Story History Routes
 * GET /api/stories - List user's stories
 * GET /api/stories/:id - Get specific story
 * POST /api/stories/save - Save a story
 * POST /api/stories/:id/share - Generate share link
 * DELETE /api/stories/:id - Delete story
 * GET /api/stories/shared/:shareId - Get shared story (public)
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
 * Generate a short share ID (like YouTube: abc123XYZ)
 */
function generateShareId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  for (let i = 0; i < 8; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return result;
}

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
    const authUser = requireAuthUser(c);
    const body = await c.req.json();
    const validatedRequest = SaveStoryRequestSchema.parse(body);

    logger.info('Save story', { userId: authUser.id, sessionId: validatedRequest.session_id });

    // Get session from KV to validate it exists
    const session = await getSession(validatedRequest.session_id, c.env);

    if (!session) {
      return c.json(
        {
          error: 'Session Not Found',
          message: 'Story session not found or expired',
        },
        404
      );
    }

    // Get Durable Object instance
    const id = c.env.USER_DO.idFromName('users');
    const userDO = c.env.USER_DO.get(id) as any;

    const now = new Date().toISOString();
    const savedStory: SavedStory = {
      id: generateUUID(),
      user_id: authUser.id,
      session_id: validatedRequest.session_id,
      title: validatedRequest.title,
      child_name: session.child.name,
      moral_focus: session.moral_focus,
      interactive: session.interactive,
      is_shared: false,
      created_at: now,
      last_played_at: now,
    };

    await userDO.saveStory(savedStory);

    logger.info('Story saved', { storyId: savedStory.id });

    return c.json({
      story: savedStory,
    }, 201);
  } catch (error) {
    logger.error('Save story failed', error);

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
 * POST /api/stories/:id/share
 */
export async function handleShareStory(c: Context<{ Bindings: Env }>): Promise<Response> {
  try {
    const authUser = requireAuthUser(c);
    const storyId = c.req.param('id');

    logger.info('Share story', { userId: authUser.id, storyId });

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

    // Generate share ID if not already shared
    const shareId = story.share_id || generateShareId();

    const updatedStory = await userDO.updateStory(storyId, {
      is_shared: true,
      share_id: shareId,
    });

    if (!updatedStory) {
      return c.json(
        {
          error: 'Share Failed',
          message: 'Failed to share story',
        },
        500
      );
    }

    logger.info('Story shared', { storyId, shareId });

    // Return share URL
    const baseUrl = new URL(c.req.url).origin;
    const shareUrl = `${baseUrl}/shared/${shareId}`;

    return c.json({
      share_id: shareId,
      share_url: shareUrl,
      story: updatedStory,
    });
  } catch (error) {
    logger.error('Share story failed', error);
    return c.json(
      {
        error: 'Share Failed',
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

/**
 * GET /api/stories/shared/:shareId
 * Public endpoint - no auth required
 */
export async function handleGetSharedStory(c: Context<{ Bindings: Env }>): Promise<Response> {
  try {
    const shareId = c.req.param('shareId');

    logger.info('Get shared story', { shareId });

    // Get Durable Object instance
    const id = c.env.USER_DO.idFromName('users');
    const userDO = c.env.USER_DO.get(id) as any;

    const story = await userDO.getStoryByShareId(shareId);

    if (!story || !story.is_shared) {
      return c.json(
        {
          error: 'Story Not Found',
          message: 'Shared story not found',
        },
        404
      );
    }

    // Get session data from KV
    const session = await getSession(story.session_id, c.env);

    if (!session) {
      return c.json(
        {
          error: 'Session Expired',
          message: 'Story session has expired',
        },
        410
      );
    }

    // Update last played timestamp
    await userDO.updateStory(story.id, {
      last_played_at: new Date().toISOString(),
    });

    return c.json({
      story: {
        title: story.title,
        child_name: story.child_name,
        moral_focus: story.moral_focus,
        interactive: story.interactive,
        created_at: story.created_at,
      },
      session,
    });
  } catch (error) {
    logger.error('Get shared story failed', error);
    return c.json(
      {
        error: 'Failed to Get Story',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
}
