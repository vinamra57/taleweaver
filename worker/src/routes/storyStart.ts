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
import { generateVoiceFromDescription } from '../services/elevenlabs';
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
import { getVoiceId, PRESET_VOICES } from '../constants/voices';

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
    const voiceDescription = promptResponse.voice_description;

    logger.info('Detailed story prompt generated', {
      theme: promptResponse.story_theme,
      voiceDescription,
    });

    // Get worker URL from request
    const workerUrl = new URL(c.req.url).origin;

    // ========================================================================
    // VOICE SELECTION: Determine which voice to use
    // ========================================================================

    const voiceSelection = validatedRequest.voice_selection || 'custom';
    let finalVoiceId: string;
    let finalVoiceDescription: string | undefined;

    if (voiceSelection.startsWith('cloned:')) {
      // Cloned voice: Extract voice ID from format "cloned:{voice_id}"
      finalVoiceId = voiceSelection.substring(7); // Remove "cloned:" prefix
      finalVoiceDescription = 'User cloned voice';
      logger.info('Using cloned voice', { voiceId: finalVoiceId });
    } else if (voiceSelection === 'custom') {
      // Custom voice: Generate voice from description
      logger.info('Using custom voice generation');
      finalVoiceId = await generateVoiceFromDescription(voiceDescription, env);
      finalVoiceDescription = voiceDescription;
      logger.info('Custom voice generated', { voiceId: finalVoiceId });
    } else {
      // Preset voice: Use predefined voice ID
      const presetVoice = PRESET_VOICES[voiceSelection];
      finalVoiceId = presetVoice.id;
      finalVoiceDescription = presetVoice.description;
      logger.info('Using preset voice', {
        voiceSelection,
        voiceName: presetVoice.name,
        voiceId: finalVoiceId,
      });
    }

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

      // Generate story text (voice already determined above)
      const storyResponse = await generateNonInteractiveStory(storyPrompt, env);

      logger.info('Story generated', { voiceId: finalVoiceId });

      // Create segment with audio using the selected voice
      const segment = await createSegmentWithAudio(
        sessionId,
        'segment_1',
        storyResponse.story_text,
        0,
        env,
        workerUrl,
        undefined, // no choice text for non-interactive
        finalVoiceId
      );

      // Create and save session
      const session: Session = {
        session_id: sessionId,
        child: validatedRequest.child,
        story_length: validatedRequest.story_length,
        interactive: false,
        moral_focus: validatedRequest.moral_focus,
        story_prompt: detailedStoryPrompt,
        voice_selection: voiceSelection,
        narrator_voice_id: finalVoiceId,
        voice_description: finalVoiceDescription,
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

    // Generate first segment (voice already determined above)
    const firstSegmentResponse = await generateFirstSegment(firstSegmentPrompt, env);

    logger.info('First segment generated', { voiceId: finalVoiceId });

    // Create first segment (start → checkpoint 1) using the selected voice
    const firstSegment = await createSegmentWithAudio(
      sessionId,
      generateSegmentId(0), // segment_1
      firstSegmentResponse.segment_text,
      0,
      env,
      workerUrl,
      undefined, // no choice text for first segment
      finalVoiceId
    );

    // Create and save initial session (without branches yet)
    const session: Session = {
      session_id: sessionId,
      child: validatedRequest.child,
      story_length: validatedRequest.story_length,
      interactive: true,
      moral_focus: validatedRequest.moral_focus,
      story_prompt: detailedStoryPrompt,
      voice_selection: voiceSelection,
      narrator_voice_id: finalVoiceId,
      voice_description: finalVoiceDescription,
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
