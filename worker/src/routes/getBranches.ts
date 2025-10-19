/**
 * GET /api/story/branches/:sessionId/:checkpoint
 * Get pre-generated branches for a specific checkpoint
 */

import { Context } from 'hono';
import type { Env } from '../types/env';
import type { StoryBranch } from '../schemas/story';
import { getSession } from '../services/kv';
import { getSegmentIdForBranch } from '../services/branchOrchestrator';
import { ValidationError, SessionNotFoundError } from '../utils/errors';
import { createLogger } from '../utils/logger';

const logger = createLogger('Get Branches Route');

export interface GetBranchesResponse {
  branches: StoryBranch[];
  branches_ready: boolean;
}

export async function handleGetBranches(c: Context): Promise<Response> {
  const env = c.env as Env;

  try {
    const sessionId = c.req.param('sessionId');
    const checkpointParam = c.req.param('checkpoint');
    const checkpoint = parseInt(checkpointParam, 10);

    if (isNaN(checkpoint)) {
      throw new ValidationError('Invalid checkpoint parameter');
    }

    logger.info('Fetching branches', { sessionId, checkpoint });

    // Fetch session from KV
    const session = await getSession(sessionId, env);

    // Check if branches exist for this checkpoint
    const segmentA = session.segments.find(
      (s) => s.id === getSegmentIdForBranch(checkpoint, 'A')
    );
    const segmentB = session.segments.find(
      (s) => s.id === getSegmentIdForBranch(checkpoint, 'B')
    );

    if (!segmentA || !segmentB) {
      // Branches not yet generated
      logger.info('Branches not yet available', { sessionId, checkpoint });

      return c.json({
        branches: [],
        branches_ready: false,
      } as GetBranchesResponse, 200);
    }

    // Reconstruct branches from segments
    const branches: StoryBranch[] = [
      {
        choice_value: 'A' as const,
        choice_text: segmentA.choice_text || 'Choice A',
        segment: segmentA,
      },
      {
        choice_value: 'B' as const,
        choice_text: segmentB.choice_text || 'Choice B',
        segment: segmentB,
      },
    ];

    logger.info('Branches retrieved successfully', { sessionId, checkpoint });

    return c.json({
      branches,
      branches_ready: true,
    } as GetBranchesResponse, 200);
  } catch (error) {
    logger.error('Get branches failed', error);

    if (error instanceof ValidationError) {
      return c.json(
        {
          error: 'Validation Error',
          message: error.message,
        },
        400
      );
    }

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
        error: 'Failed to Get Branches',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
}
