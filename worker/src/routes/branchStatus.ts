/**
 * GET /api/story/status/:sessionId
 * Check the status of branch generation for a session
 */

import { Context } from 'hono';
import type { Env } from '../types/env';
import { getSession } from '../services/kv';
import { SessionNotFoundError } from '../utils/errors';
import { createLogger } from '../utils/logger';

const logger = createLogger('Branch Status Route');

export interface BranchStatusResponse {
  branches_ready: boolean;
  generation_in_progress: boolean;
  current_checkpoint: number;
}

export async function handleBranchStatus(c: Context): Promise<Response> {
  const env = c.env as Env;

  try {
    const sessionId = c.req.param('sessionId');

    logger.debug('Checking branch status', { sessionId });

    // Fetch session from KV
    const session = await getSession(sessionId, env);

    // Build response
    const response: BranchStatusResponse = {
      branches_ready: session.next_branches_ready,
      generation_in_progress: session.generation_in_progress,
      current_checkpoint: session.current_checkpoint,
    };

    return c.json(response, 200);
  } catch (error) {
    logger.error('Branch status check failed', error);

    if (error instanceof SessionNotFoundError) {
      return c.json(
        {
          error: 'Session Expired',
          message: error.message,
        },
        410
      );
    }

    return c.json(
      {
        error: 'Status Check Failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
}
