/**
 * Song Session Service
 * Handles saving and retrieving song sessions in KV
 */

import type { Env } from '../types/env';
import { SongSession, SongSessionSchema } from '../schemas/song';
import { StorageError } from '../utils/errors';
import { createLogger } from '../utils/logger';

const logger = createLogger('Song Session Service');
const SONG_SESSION_PREFIX = 'song:';

/**
 * Save a song session to KV with TTL
 */
export async function saveSongSession(
  session: SongSession,
  env: Env
): Promise<void> {
  try {
    logger.debug(`Saving song session: ${session.session_id}`);

    // Validate session payload
    SongSessionSchema.parse(session);

    const ttlHours = parseInt(env.SESSION_TTL_HOURS || '12', 10);
    const ttlSeconds = ttlHours * 60 * 60;

    await env.TALEWEAVER_SESSIONS.put(
      `${SONG_SESSION_PREFIX}${session.session_id}`,
      JSON.stringify(session),
      { expirationTtl: ttlSeconds }
    );

    logger.info(
      `Song session saved successfully: ${session.session_id} (TTL: ${ttlHours}h)`
    );
  } catch (error) {
    logger.error(`Failed to save song session: ${session.session_id}`, error);
    throw new StorageError(`Failed to save song session: ${error}`, 'KV');
  }
}

/**
 * Retrieve a song session from KV
 */
export async function getSongSession(
  sessionId: string,
  env: Env
): Promise<SongSession | null> {
  try {
    logger.debug(`Fetching song session: ${sessionId}`);

    const data = await env.TALEWEAVER_SESSIONS.get(
      `${SONG_SESSION_PREFIX}${sessionId}`,
      'json'
    );

    if (!data) {
      logger.warn(`Song session not found: ${sessionId}`);
      return null;
    }

    const session = SongSessionSchema.parse(data);
    logger.info(`Song session retrieved successfully: ${sessionId}`);
    return session;
  } catch (error) {
    logger.error(`Failed to retrieve song session: ${sessionId}`, error);
    throw new StorageError(`Failed to retrieve song session: ${error}`, 'KV');
  }
}
