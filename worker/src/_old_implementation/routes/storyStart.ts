/**
 * POST /api/story/start
 * Creates a new story session with Scene 1
 */

import { Context } from 'hono';
import type { Env } from '../types/env';
import {
  StartRequestSchema,
  StartResponse,
  Session,
  Scene,
} from '../schemas/story';
import { generateStartScene } from '../services/gemini';
import { generateTTS } from '../services/elevenlabs';
import { uploadAudio, getAudioUrl } from '../services/r2';
import { rewriteForGradeLevel } from '../services/workersAi';
import { saveSession } from '../services/kv';
import { getDefaultMoralMeter } from '../services/moralMeter';
import { buildStartPrompt } from '../prompts/start';
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
      age: validatedRequest.child.age,
      moral: validatedRequest.moral_focus,
    });

    // Generate session ID
    const sessionId = generateUUID();

    // Step 1: Build prompt and call Gemini
    const prompt = buildStartPrompt(
      validatedRequest.child,
      validatedRequest.moral_focus
    );

    const geminiResponse = await generateStartScene(prompt, env);

    // Step 2: Rewrite for grade level with Workers AI
    let sceneText = geminiResponse.scene_text;

    try {
      sceneText = await rewriteForGradeLevel(
        sceneText,
        validatedRequest.child.age,
        env
      );
    } catch (error) {
      logger.warn('Workers AI rewrite failed, using original text', error);
      // Continue with original text
    }

    // Step 3: Generate TTS audio
    const audioBuffer = await generateTTS(
      sceneText,
      geminiResponse.emotion_hint,
      env
    );

    // Step 4: Upload to R2
    const sceneId = 'scene_1';
    const audioKey = await uploadAudio(sessionId, sceneId, audioBuffer, env);

    // Get worker URL from request
    const workerUrl = new URL(c.req.url).origin;
    const audioUrl = getAudioUrl(audioKey, env, workerUrl);

    // Step 5: Create scene object
    const scene: Scene = {
      id: sceneId,
      text: sceneText,
      emotion_hint: geminiResponse.emotion_hint,
      audio_url: audioUrl,
    };

    // Step 6: Initialize session and save to KV
    const session: Session = {
      session_id: sessionId,
      child: validatedRequest.child,
      moral_focus: validatedRequest.moral_focus,
      scenes: [scene],
      choices: [],
      prior_summary: `The story began: ${sceneText.slice(0, 150)}...`,
      meter: getDefaultMoralMeter(),
      created_at: new Date().toISOString(),
    };

    await saveSession(session, env);

    // Step 7: Build response
    const response: StartResponse = {
      session_id: sessionId,
      scene,
      choice: geminiResponse.choice,
    };

    logger.info('Story started successfully', { sessionId });

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
