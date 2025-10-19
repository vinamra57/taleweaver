/**
 * POST /api/story/continue
 * Continues the story after user makes a choice
 */

import { Context } from 'hono';
import type { Env } from '../types/env';
import {
  ContinueRequestSchema,
  ContinueResponse,
  StoryBranch,
} from '../schemas/story';
import type { ChoiceRecord } from '../schemas/selThemes';
import { getSession, saveSession } from '../services/kv';
import { getSegmentIdForBranch } from '../services/branchOrchestrator';
import { generateNextBranchesAsync } from '../services/asyncBranchGeneration';
import { isFinalCheckpoint } from '../services/storyStructure';
import { ValidationError, SessionNotFoundError } from '../utils/errors';
import { createLogger } from '../utils/logger';

const logger = createLogger('Story Continue Route');

export async function handleStoryContinue(c: Context): Promise<Response> {
  const env = c.env as Env;

  try {
    // Parse and validate request body
    const body = await c.req.json();
    const validatedRequest = ContinueRequestSchema.parse(body);

    logger.info('Continuing story', {
      sessionId: validatedRequest.session_id,
      checkpoint: validatedRequest.checkpoint,
      choice: validatedRequest.chosen_branch,
    });

    // Fetch session from KV
    const session = await getSession(validatedRequest.session_id, env);

    // Validate checkpoint number
    if (validatedRequest.checkpoint !== session.current_checkpoint + 1) {
      throw new ValidationError(
        `Invalid checkpoint. Expected ${session.current_checkpoint + 1}, got ${validatedRequest.checkpoint}`
      );
    }

    // Find the pre-generated segment for the chosen branch
    const chosenSegmentId = getSegmentIdForBranch(
      validatedRequest.checkpoint,
      validatedRequest.chosen_branch
    );

    const chosenSegment = session.segments.find((s) => s.id === chosenSegmentId);

    if (!chosenSegment) {
      throw new ValidationError(
        `Segment not found for choice ${validatedRequest.chosen_branch} at checkpoint ${validatedRequest.checkpoint}`
      );
    }

    logger.info('Found pre-generated segment', { segmentId: chosenSegment.id });

    // Get the choice quality from branches metadata
    const chosenBranchInfo = session.branches_metadata?.[chosenSegmentId];
    const choiceQuality = chosenBranchInfo?.choice_quality || 'growth_oriented'; // fallback for old sessions

    // Update session: add choice to path, increment checkpoint
    session.chosen_path.push(validatedRequest.chosen_branch);
    session.current_checkpoint = validatedRequest.checkpoint;

    // Track choice record for evaluation
    if (!session.choice_records) {
      session.choice_records = [];
    }

    const choiceRecord: ChoiceRecord = {
      checkpoint_number: validatedRequest.checkpoint,
      chosen_value: validatedRequest.chosen_branch,
      chosen_text: chosenSegment.choice_text || `Choice ${validatedRequest.chosen_branch}`,
      choice_quality: choiceQuality,
    };
    session.choice_records.push(choiceRecord);

    logger.info('Choice recorded', {
      checkpoint: validatedRequest.checkpoint,
      choice: validatedRequest.chosen_branch,
      quality: choiceQuality,
    });

    // Check if this is the final checkpoint
    const isFinal = isFinalCheckpoint(session.current_checkpoint, session.total_checkpoints);

    if (isFinal) {
      // FINAL SEGMENT: No more choices, story is complete
      logger.info('Reached final checkpoint, story complete');

      await saveSession(session, env);

      const response: ContinueResponse = {
        segment: chosenSegment,
        story_complete: true,
      };

      logger.info('Story continued successfully (final)', {
        sessionId: session.session_id,
      });

      return c.json(response, 200);
    }

    // NOT FINAL: Check if next branches are already generated
    logger.info('Checking for pre-generated branches', {
      nextCheckpoint: session.current_checkpoint + 1,
      branchesReady: session.next_branches_ready,
    });

    // Get worker URL from request
    const workerUrl = new URL(c.req.url).origin;

    // Determine next checkpoint number
    const nextCheckpointNumber = session.current_checkpoint + 1;

    // Find pre-generated branches for the next checkpoint
    let nextBranches: StoryBranch[] | undefined = undefined;

    if (session.next_branches_ready) {
      // Branches should already be generated - find them
      const segmentA = session.segments.find(
        (s) => s.id === getSegmentIdForBranch(nextCheckpointNumber, 'A')
      );
      const segmentB = session.segments.find(
        (s) => s.id === getSegmentIdForBranch(nextCheckpointNumber, 'B')
      );

      if (segmentA && segmentB) {
        // Reconstruct branches from pre-generated segments with choice quality
        const branchAInfo = session.branches_metadata?.[segmentA.id];
        const branchBInfo = session.branches_metadata?.[segmentB.id];

        nextBranches = [
          {
            choice_text: segmentA.choice_text || 'Choice A',
            choice_value: 'A',
            choice_quality: branchAInfo?.choice_quality || 'growth_oriented',
            segment: segmentA
          },
          {
            choice_text: segmentB.choice_text || 'Choice B',
            choice_value: 'B',
            choice_quality: branchBInfo?.choice_quality || 'less_ideal',
            segment: segmentB
          },
        ];
        logger.info('Found pre-generated branches', { nextCheckpoint: nextCheckpointNumber });
      } else {
        logger.warn('Branches marked ready but not found in segments', {
          nextCheckpoint: nextCheckpointNumber,
        });
      }
    } else {
      logger.warn('Branches not ready yet - user may have to wait', {
        generationInProgress: session.generation_in_progress,
      });
    }

    // Mark that we need new branches for the checkpoint after next
    session.next_branches_ready = false;

    // Save updated session
    await saveSession(session, env);

    // Trigger async generation of the NEXT set of branches
    // (for checkpoint after the one we're about to enter)
    c.executionCtx.waitUntil(
      generateNextBranchesAsync(
        session.session_id,
        session.current_checkpoint,
        chosenSegment.text,
        env,
        workerUrl
      )
    );

    // Build response
    const response: ContinueResponse = {
      segment: chosenSegment,
      next_branches: nextBranches,
      story_complete: false,
    };

    logger.info('Story continued successfully (async generation triggered)', {
      sessionId: session.session_id,
      currentCheckpoint: session.current_checkpoint,
    });

    return c.json(response, 200);
  } catch (error) {
    logger.error('Story continue failed', error);

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
        error: 'Story Continuation Failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
}
