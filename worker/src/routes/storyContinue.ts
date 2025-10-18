/**
 * POST /api/story/continue
 * Continues the story after user makes a choice
 */

import { Context } from 'hono';
import type { Env } from '../types/env';
import {
  ContinueRequestSchema,
  ContinueResponse,
} from '../schemas/story';
import { getSession, saveSession } from '../services/kv';
import { generateContinuation } from '../services/gemini';
import { createBranchesInParallel, getSegmentIdForBranch } from '../services/branchOrchestrator';
import { buildContinuationPrompt } from '../prompts/storyGeneration';
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

    // Update session: add choice to path, increment checkpoint
    session.chosen_path.push(validatedRequest.chosen_branch);
    session.current_checkpoint = validatedRequest.checkpoint;

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

    // NOT FINAL: Generate next two branches for the upcoming choice
    logger.info('Generating next branches', {
      nextCheckpoint: session.current_checkpoint + 1,
    });

    // Build prompt for continuation
    const continuationPrompt = buildContinuationPrompt(
      session.story_prompt,
      session.child,
      session.moral_focus,
      session.words_per_segment,
      session.chosen_path,
      session.current_checkpoint,
      session.total_checkpoints,
      chosenSegment.text
    );

    // Generate next branches with Gemini
    const continuationResponse = await generateContinuation(continuationPrompt, env);

    // Get worker URL from request
    const workerUrl = new URL(c.req.url).origin;

    // Determine next checkpoint number
    const nextCheckpointNumber = session.current_checkpoint + 1;

    // Generate both branches in parallel
    const branches = await createBranchesInParallel(
      session.session_id,
      continuationResponse.choice_a?.text || 'Choice A',
      continuationResponse.choice_a?.next_segment || '',
      continuationResponse.choice_b?.text || 'Choice B',
      continuationResponse.choice_b?.next_segment || '',
      nextCheckpointNumber,
      `segment_${nextCheckpointNumber + 1}`,
      env,
      workerUrl
    );

    // Add new segments to session
    session.segments.push(branches[0].segment, branches[1].segment);

    // Save updated session
    await saveSession(session, env);

    // Build response
    const response: ContinueResponse = {
      segment: chosenSegment,
      next_branches: branches,
      story_complete: false,
    };

    logger.info('Story continued successfully', {
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
