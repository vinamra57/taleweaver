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
import { createSegmentWithAudio } from '../services/branchOrchestrator';
import { generateFirstBranchesAsync } from '../services/asyncBranchGeneration';
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
        next_branches_ready: false,
        generation_in_progress: false,
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
    // INTERACTIVE MODE: Generate first segment, then branches async
    // ========================================================================

    logger.info('Generating interactive story with async branch generation');

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

    logger.info('First segment created', {
      hasImage: !!firstSegment.image_url,
      imageUrl: firstSegment.image_url,
      hasAudio: !!firstSegment.audio_url,
    });

    // Create and save initial session (without branches yet)
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
      segments: [firstSegment],
      next_branches_ready: false,
      generation_in_progress: false,
      created_at: new Date().toISOString(),
    };

    await saveSession(session, env);

    // Trigger async branch generation in the background
    // This will run after the response is sent
    c.executionCtx.waitUntil(
      generateFirstBranchesAsync(sessionId, env, workerUrl)
    );

    // Build response (without branches - they'll be generated in background)
    const response: StartResponse = {
      session_id: sessionId,
      segment: firstSegment,
      next_branches: undefined, // Branches will be ready by the time audio finishes
      story_complete: false,
    };

    logger.info('Interactive story started successfully (async generation triggered)', { sessionId });
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
