/**
 * POST /api/story/evaluate
 * Generates an evaluation report for a completed story session
 */

import { Context } from 'hono';
import type { Env } from '../types/env';
import {
  EvaluationRequestSchema,
  EvaluationResponse,
} from '../schemas/story';
import { getSession, saveSession } from '../services/kv';
import { generateStoryEvaluation } from '../services/evaluation';
import { SessionNotFoundError, ValidationError } from '../utils/errors';
import { createLogger } from '../utils/logger';

const logger = createLogger('Story Evaluation Route');

export async function handleStoryEvaluation(c: Context): Promise<Response> {
  const env = c.env as Env;

  try {
    // Parse and validate request body
    const body = await c.req.json();
    const validatedRequest = EvaluationRequestSchema.parse(body);

    logger.info('Evaluating story session', {
      sessionId: validatedRequest.session_id,
    });

    // Fetch session from KV
    const session = await getSession(validatedRequest.session_id, env);

    // Validate that the story is complete
    if (!session.interactive || session.current_checkpoint < session.total_checkpoints) {
      throw new ValidationError('Story must be completed before evaluation');
    }

    // Build evaluation request from session data
    const evaluationRequest = {
      child: {
        name: session.child.name,
        age_group: session.child.age_range,
        gender: session.child.gender,
        interests: session.child.interests.split(',').map(i => i.trim()),
      },
      moral_focus: session.moral_focus,
      story_history: session.segments
        .filter(segment => segment.choice_text) // Only segments that came from choices
        .map(segment => ({
          segment_text: segment.text,
          chosen_option: segment.choice_text,
          checkpoint_index: segment.checkpoint_number,
        })),
    };

    // Check if evaluation already exists
    if (session.evaluation_summary) {
      logger.info('Returning cached evaluation', { sessionId: session.session_id });
      const response: EvaluationResponse = {
        evaluation: {
          summary: session.evaluation_summary,
        },
      };
      return c.json(response, 200);
    }

    // Generate evaluation using Gemini
    const evaluation = await generateStoryEvaluation(evaluationRequest, env);

    // Save evaluation to session
    session.evaluation_summary = evaluation.summary;
    await saveSession(session, env);

    const response: EvaluationResponse = {
      evaluation,
    };

    logger.info('Story evaluation completed and saved successfully', {
      sessionId: session.session_id,
    });

    return c.json(response, 200);
  } catch (error) {
    logger.error('Failed to evaluate story', error);

    if (error instanceof SessionNotFoundError) {
      return c.json({ error: 'Story session not found' }, 404);
    }

    if (error instanceof ValidationError) {
      return c.json({ error: error.message }, 400);
    }

    return c.json({ error: 'Failed to generate evaluation' }, 500);
  }
}