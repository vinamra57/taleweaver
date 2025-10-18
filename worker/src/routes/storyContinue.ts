/**
 * POST /api/story/continue
 * Continues the story with Scene 2 based on the chosen option
 */

import { Context } from 'hono';
import type { Env } from '../types/env';
import {
  ContinueRequestSchema,
  ContinueResponse,
  Scene,
} from '../schemas/story';
import { getSession, saveSession } from '../services/kv';
import { generateContinueScene } from '../services/gemini';
import { generateTTS } from '../services/elevenlabs';
import { uploadAudio, getAudioUrl } from '../services/r2';
import { rewriteForGradeLevel } from '../services/workersAi';
import { buildPriorSummary } from '../services/summary';
import { calculateMoralMeter } from '../services/moralMeter';
import { buildContinuePrompt } from '../prompts/continue';
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
      choice: validatedRequest.choice,
    });

    // Step 1: Fetch session from KV
    const session = await getSession(validatedRequest.session_id, env);

    // Validate that the last scene ID matches
    const lastScene = session.scenes[session.scenes.length - 1];
    if (lastScene.id !== validatedRequest.last_scene_id) {
      throw new ValidationError(
        `Last scene ID mismatch. Expected: ${lastScene.id}, Got: ${validatedRequest.last_scene_id}`
      );
    }

    // Step 2: Update choices array
    session.choices.push(validatedRequest.choice);

    // Step 3: Build prior summary
    const priorSummary = buildPriorSummary(session.scenes, session.choices);

    // Get the chosen option text (would need to store choice options in session for full implementation)
    const chosenOptionText = `Option ${validatedRequest.choice}`;

    // Step 4: Build prompt and call Gemini
    const prompt = buildContinuePrompt(
      session.child.age,
      priorSummary,
      chosenOptionText
    );

    const geminiResponse = await generateContinueScene(prompt, env);

    // Step 5: Rewrite for grade level with Workers AI
    let sceneText = geminiResponse.scene_text;

    try {
      sceneText = await rewriteForGradeLevel(
        sceneText,
        session.child.age,
        env
      );
    } catch (error) {
      logger.warn('Workers AI rewrite failed, using original text', error);
      // Continue with original text
    }

    // Step 6: Generate TTS audio
    const audioBuffer = await generateTTS(
      sceneText,
      geminiResponse.emotion_hint,
      env
    );

    // Step 7: Upload to R2
    const sceneId = 'scene_2';
    const audioKey = await uploadAudio(
      session.session_id,
      sceneId,
      audioBuffer,
      env
    );

    // Get worker URL from request
    const workerUrl = new URL(c.req.url).origin;
    const audioUrl = getAudioUrl(audioKey, env, workerUrl);

    // Step 8: Create scene object
    const scene: Scene = {
      id: sceneId,
      text: sceneText,
      emotion_hint: geminiResponse.emotion_hint,
      audio_url: audioUrl,
    };

    // Step 9: Add scene to session
    session.scenes.push(scene);

    // Step 10: Update prior summary
    session.prior_summary = buildPriorSummary(session.scenes, session.choices);

    // Step 11: Calculate moral meter
    session.meter = calculateMoralMeter(
      session.scenes,
      session.choices,
      session.moral_focus
    );

    // Step 12: Save updated session to KV
    await saveSession(session, env);

    // Step 13: Build response
    const response: ContinueResponse = {
      scene,
      ending: geminiResponse.ending,
      moral_meter: session.meter,
    };

    logger.info('Story continued successfully', { sessionId: session.session_id });

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
