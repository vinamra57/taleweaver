/**
 * KV Service - Session Management
 * Handles reading and writing session data to Cloudflare KV
 */

import type { Env } from '../types/env';
import { Session, SessionSchema } from '../schemas/story';
import { SessionNotFoundError, StorageError } from '../utils/errors';
import { createLogger } from '../utils/logger';

const logger = createLogger('KV Service');

/**
 * Get session from KV
 */
export async function getSession(
  sessionId: string,
  env: Env
): Promise<Session> {
  try {
    logger.debug(`Fetching session: ${sessionId}`);

    const sessionData = await env.TALEWEAVER_SESSIONS.get(sessionId, 'json');

    if (!sessionData) {
      throw new SessionNotFoundError(sessionId);
    }

    // Validate session data structure
    const session = SessionSchema.parse(sessionData);

    logger.info(`Session retrieved successfully: ${sessionId}`);
    return session;
  } catch (error) {
    if (error instanceof SessionNotFoundError) {
      throw error;
    }
    logger.error(`Failed to get session: ${sessionId}`, error);
    throw new StorageError(`Failed to retrieve session: ${error}`, 'KV');
  }
}

/**
 * Save session to KV with TTL
 */
export async function saveSession(
  session: Session,
  env: Env
): Promise<void> {
  try {
    logger.debug(`Saving session: ${session.session_id}`);

    // Validate session before saving
    SessionSchema.parse(session);

    // Calculate TTL in seconds (default: 12 hours)
    const ttlHours = parseInt(env.SESSION_TTL_HOURS || '12', 10);
    const ttlSeconds = ttlHours * 60 * 60;

    // Save to KV with expiration
    await env.TALEWEAVER_SESSIONS.put(
      session.session_id,
      JSON.stringify(session),
      {
        expirationTtl: ttlSeconds,
      }
    );

    logger.info(
      `Session saved successfully: ${session.session_id} (TTL: ${ttlHours}h)`
    );
  } catch (error) {
    logger.error(`Failed to save session: ${session.session_id}`, error);
    throw new StorageError(`Failed to save session: ${error}`, 'KV');
  }
}

/**
 * Delete session from KV (optional - for cleanup)
 */
export async function deleteSession(
  sessionId: string,
  env: Env
): Promise<void> {
  try {
    logger.debug(`Deleting session: ${sessionId}`);
    await env.TALEWEAVER_SESSIONS.delete(sessionId);
    logger.info(`Session deleted: ${sessionId}`);
  } catch (error) {
    logger.error(`Failed to delete session: ${sessionId}`, error);
    throw new StorageError(`Failed to delete session: ${error}`, 'KV');
  }
}

/**
 * Check if session exists
 */
export async function sessionExists(
  sessionId: string,
  env: Env
): Promise<boolean> {
  try {
    const sessionData = await env.TALEWEAVER_SESSIONS.get(sessionId);
    return sessionData !== null;
  } catch (error) {
    logger.error(`Failed to check session existence: ${sessionId}`, error);
    return false;
  }
}
