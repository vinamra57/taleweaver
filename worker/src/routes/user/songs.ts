/**
 * Song History Routes
 * GET /api/songs - List user's songs
 * GET /api/songs/:id - Get specific song
 * POST /api/songs/save - Save a song
 * DELETE /api/songs/:id - Delete song
 */

import { Context } from 'hono';
import type { Env } from '../../types/env';
import type { SavedSong } from '../../schemas/auth/user';
import { SaveSongRequestSchema } from '../../schemas/auth/user';
import { requireAuthUser } from '../../auth/middleware';
import { getSongSession } from '../../services/songSessions';
import { generateUUID } from '../../utils/validation';
import { ValidationError } from '../../utils/errors';
import { createLogger } from '../../utils/logger';

const logger = createLogger('Song Routes');

/**
 * GET /api/songs
 */
export async function handleListSongs(c: Context<{ Bindings: Env }>): Promise<Response> {
  try {
    const authUser = requireAuthUser(c);
    const id = c.env.USER_DO.idFromName('users');
    const userDO = c.env.USER_DO.get(id) as any;
    logger.info('List songs', { userId: authUser.id });
    const songs = await userDO.getUserSongs(authUser.id);
    return c.json({ songs });
  } catch (error) {
    logger.error('List songs failed', error);
    return c.json({ error: 'Failed to list songs', message: (error as any)?.message || 'Unknown error' }, 500);
  }
}

/**
 * GET /api/songs/:id
 */
export async function handleGetSong(c: Context<{ Bindings: Env }>): Promise<Response> {
  try {
    const authUser = requireAuthUser(c);
    const songId = c.req.param('id');
    const id = c.env.USER_DO.idFromName('users');
    const userDO = c.env.USER_DO.get(id) as any;
    logger.info('Get song', { userId: authUser.id, songId });

    const song = await userDO.getSong(songId);
    if (!song) {
      return c.json({ error: 'Not Found', message: 'Song not found' }, 404);
    }
    if (song.user_id !== authUser.id) {
      return c.json({ error: 'Forbidden', message: 'Access denied' }, 403);
    }

    const session = await getSongSession(song.session_id, c.env);
    return c.json({ song, session });
  } catch (error) {
    logger.error('Get song failed', error);
    return c.json({ error: 'Failed to get song', message: (error as any)?.message || 'Unknown error' }, 500);
  }
}

/**
 * POST /api/songs/save
 */
export async function handleSaveSong(c: Context<{ Bindings: Env }>): Promise<Response> {
  try {
    const authUser = requireAuthUser(c);
    const body = await c.req.json();
    const validated = SaveSongRequestSchema.parse(body);
    logger.info('Save song', { userId: authUser.id, sessionId: validated.session_id });

    const session = await getSongSession(validated.session_id, c.env);
    if (!session) {
      return c.json({ error: 'Session Not Found', message: 'Song session not found or expired' }, 404);
    }

    const id = c.env.USER_DO.idFromName('users');
    const userDO = c.env.USER_DO.get(id) as any;
    const now = new Date().toISOString();

    const savedSong: SavedSong = {
      id: generateUUID(),
      user_id: authUser.id,
      session_id: validated.session_id,
      title: validated.title,
      child_name: session.child_name,
      moral_focus: session.moral_focus,
      song_type: session.song_type,
      musical_style: session.musical_style,
      duration_seconds: session.duration_seconds,
      created_at: now,
      last_played_at: now,
    };

    await userDO.saveSong(savedSong);
    logger.info('Song saved', { songId: savedSong.id });
    return c.json({ song: savedSong }, 201);
  } catch (error) {
    logger.error('Save song failed', error);
    if (error instanceof ValidationError) {
      return c.json({ error: 'Validation Error', message: error.message }, 400);
    }
    return c.json({ error: 'Save Failed', message: (error as any)?.message || 'Unknown error' }, 500);
  }
}

/**
 * DELETE /api/songs/:id
 */
export async function handleDeleteSong(c: Context<{ Bindings: Env }>): Promise<Response> {
  try {
    const authUser = requireAuthUser(c);
    const songId = c.req.param('id');
    const id = c.env.USER_DO.idFromName('users');
    const userDO = c.env.USER_DO.get(id) as any;
    logger.info('Delete song', { userId: authUser.id, songId });
    const success = await userDO.deleteSong(songId, authUser.id);
    if (!success) {
      return c.json({ error: 'Delete Failed', message: 'Song not found or access denied' }, 404);
    }
    return c.json({ message: 'Song deleted successfully' });
  } catch (error) {
    logger.error('Delete song failed', error);
    return c.json({ error: 'Delete Failed', message: (error as any)?.message || 'Unknown error' }, 500);
  }
}

