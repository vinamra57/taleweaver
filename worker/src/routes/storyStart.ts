/**
 * POST /api/story/start
 * Creates a new story session (interactive or non-interactive)
 */

import { Context } from 'hono';
import type { Env } from '../types/env';
import {
  StartRequestSchema,
  StartResponse,
  Session,
} from '../schemas/story';
import {
  generateStoryPrompt,
  generateNonInteractiveStory,
  generateFirstSegment,
} from '../services/gemini';
import { saveSession } from '../services/kv';
import { calculateStoryStructure, generateSegmentId } from '../services/storyStructure';
import { createSegmentWithAudio, createBranchesInParallel } from '../services/branchOrchestrator';
import { buildPromptGenerationPrompt } from '../prompts/promptGeneration';
import {
  buildNonInteractiveStoryPrompt,
  buildFirstSegmentPrompt,
} from '../prompts/storyGeneration';
import { generateUUID } from '../utils/validation';
import { ValidationError } from '../utils/errors';
import { createLogger } from '../utils/logger';

const logger = createLogger('Story Start Route');

export async function handleStoryStart(c: Context): Promise<Response> {
  const env = c.env as Env;

  try {
    // Parse and validate request body
    const body = await c.req.json();
    const validatedRequest = StartRequestSchema.parse(body);

    logger.info('Starting new story', {
      name: validatedRequest.child.name,
      age: validatedRequest.child.age_range,
      length: validatedRequest.story_length,
      interactive: validatedRequest.interactive,
      moral: validatedRequest.moral_focus,
    });

    // Generate session ID
    const sessionId = generateUUID();

    // Calculate story structure
    const structure = calculateStoryStructure(
      validatedRequest.story_length,
      validatedRequest.interactive
    );

    logger.info('Story structure calculated', structure);

    // ========================================================================
    // PHASE 1: Generate detailed story prompt
    // ========================================================================

    const promptGenPrompt = buildPromptGenerationPrompt(
      validatedRequest.child,
      validatedRequest.story_length,
      validatedRequest.interactive,
      validatedRequest.moral_focus
    );

    const promptResponse = await generateStoryPrompt(promptGenPrompt, env);
    const detailedStoryPrompt = promptResponse.story_prompt;

    logger.info('Detailed story prompt generated', {
      theme: promptResponse.story_theme,
    });

    // Get worker URL from request
    const workerUrl = new URL(c.req.url).origin;

    // ========================================================================
    // PHASE 2: Generate story content based on interactive mode
    // ========================================================================

    if (!validatedRequest.interactive) {
      // NON-INTERACTIVE MODE: Single continuous story
      logger.info('Generating non-interactive story');

      const storyPrompt = buildNonInteractiveStoryPrompt(
        detailedStoryPrompt,
        validatedRequest.child,
        validatedRequest.moral_focus,
        structure.total_words
      );

      const storyResponse = await generateNonInteractiveStory(storyPrompt, env);

      // Create segment with audio
      const segment = await createSegmentWithAudio(
        sessionId,
        'segment_1',
        storyResponse.story_text,
        0,
        env,
        workerUrl
      );

      // Create and save session
      const session: Session = {
        session_id: sessionId,
        child: validatedRequest.child,
        story_length: validatedRequest.story_length,
        interactive: false,
        moral_focus: validatedRequest.moral_focus,
        story_prompt: detailedStoryPrompt,
        total_checkpoints: 0,
        current_checkpoint: 0,
        words_per_segment: structure.words_per_segment,
        chosen_path: [],
        segments: [segment],
        created_at: new Date().toISOString(),
      };

      await saveSession(session, env);

      // Build response
      const response: StartResponse = {
        session_id: sessionId,
        segment,
        story_complete: true,
      };

      logger.info('Non-interactive story created successfully', { sessionId });
      return c.json(response, 200);
    }

    // ========================================================================
    // INTERACTIVE MODE: Generate first segment + 2 branches
    // ========================================================================

    logger.info('Generating interactive story with branches');

    const firstSegmentPrompt = buildFirstSegmentPrompt(
      detailedStoryPrompt,
      validatedRequest.child,
      validatedRequest.moral_focus,
      structure.words_per_segment
    );

    const firstSegmentResponse = await generateFirstSegment(firstSegmentPrompt, env);

    // Create first segment (start → checkpoint 1)
    const firstSegment = await createSegmentWithAudio(
      sessionId,
      generateSegmentId(0), // segment_1
      firstSegmentResponse.segment_text,
      0,
      env,
      workerUrl
    );

    // Create both branches in parallel (for checkpoint 1 → 2)
    const branches = await createBranchesInParallel(
      sessionId,
      firstSegmentResponse.choice_a.text,
      firstSegmentResponse.choice_a.next_segment,
      firstSegmentResponse.choice_b.text,
      firstSegmentResponse.choice_b.next_segment,
      1, // next checkpoint number
      'segment_2', // base ID for next segments
      env,
      workerUrl
    );

    // Create and save session
    const session: Session = {
      session_id: sessionId,
      child: validatedRequest.child,
      story_length: validatedRequest.story_length,
      interactive: true,
      moral_focus: validatedRequest.moral_focus,
      story_prompt: detailedStoryPrompt,
      total_checkpoints: structure.total_checkpoints,
      current_checkpoint: 0,
      words_per_segment: structure.words_per_segment,
      chosen_path: [],
      segments: [firstSegment, branches[0].segment, branches[1].segment],
      created_at: new Date().toISOString(),
    };

    await saveSession(session, env);

    // Build response
    const response: StartResponse = {
      session_id: sessionId,
      segment: firstSegment,
      next_branches: branches,
      story_complete: false,
    };

    logger.info('Interactive story started successfully', { sessionId });
    return c.json(response, 200);
  } catch (error) {
    logger.error('Story start failed', error);

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
        error: 'Story Generation Failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
}
