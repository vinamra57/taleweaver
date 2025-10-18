/**
 * POST /api/tts (Optional)
 * Regenerates TTS audio for a scene
 */

import { Context } from 'hono';
import type { Env } from '../types/env';
import { TTSRequestSchema, TTSResponse } from '../schemas/story';
import { getSession } from '../services/kv';
import { generateTTS } from '../services/elevenlabs';
import { uploadAudio, getAudioUrl } from '../services/r2';
import { ValidationError, SessionNotFoundError } from '../utils/errors';
import { createLogger } from '../utils/logger';

const logger = createLogger('TTS Route');

export async function handleTTS(c: Context): Promise<Response> {
  const env = c.env as Env;

  try {
    // Parse and validate request body
    const body = await c.req.json();
    const validatedRequest = TTSRequestSchema.parse(body);

    logger.info('Regenerating TTS', {
      sessionId: validatedRequest.session_id,
      sceneId: validatedRequest.scene_id,
    });

    // Verify session exists
    await getSession(validatedRequest.session_id, env);

    // Generate TTS audio
    const audioBuffer = await generateTTS(
      validatedRequest.text,
      validatedRequest.emotion_hint,
      env
    );

    // Upload to R2 (overwrites existing)
    const audioKey = await uploadAudio(
      validatedRequest.session_id,
      validatedRequest.scene_id,
      audioBuffer,
      env
    );

    // Get worker URL from request
    const workerUrl = new URL(c.req.url).origin;
    const audioUrl = getAudioUrl(audioKey, env, workerUrl);

    // Build response
    const response: TTSResponse = {
      audio_url: audioUrl,
    };

    logger.info('TTS regenerated successfully', {
      sessionId: validatedRequest.session_id,
    });

    return c.json(response, 200);
  } catch (error) {
    logger.error('TTS generation failed', error);

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
        error: 'TTS Generation Failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
}
