/**
 * ElevenLabs Service - Text-to-Speech
 * Generates audio narration for story scenes
 */

import type { Env } from '../types/env';
import { ElevenLabsError } from '../utils/errors';
import { createLogger } from '../utils/logger';

type EmotionHint = 'warm' | 'curious' | 'tense' | 'relieved';

const logger = createLogger('ElevenLabs Service');

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1/text-to-speech';

/**
 * Voice settings based on emotion hints
 */
const VOICE_SETTINGS = {
  warm: {
    stability: 0.7,
    similarity_boost: 0.8,
  },
  curious: {
    stability: 0.6,
    similarity_boost: 0.7,
  },
  tense: {
    stability: 0.5,
    similarity_boost: 0.75,
  },
  relieved: {
    stability: 0.75,
    similarity_boost: 0.85,
  },
};

/**
 * Generate TTS audio with ElevenLabs
 * Returns audio as ArrayBuffer
 */
export async function generateTTS(
  text: string,
  emotionHint: EmotionHint,
  env: Env,
  maxRetries = 1
): Promise<ArrayBuffer> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      logger.debug(
        `Generating TTS (attempt ${attempt + 1}/${maxRetries + 1})`,
        { emotionHint, textLength: text.length }
      );

      const voiceId = env.ELEVENLABS_VOICE_ID;
      const modelId = env.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2';
      const voiceSettings = VOICE_SETTINGS[emotionHint] || VOICE_SETTINGS.warm;

      const response = await fetch(
        `${ELEVENLABS_API_URL}/${voiceId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'xi-api-key': env.ELEVENLABS_API_KEY,
          },
          body: JSON.stringify({
            text,
            model_id: modelId,
            voice_settings: voiceSettings,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new ElevenLabsError(
          `API returned ${response.status}: ${errorText}`
        );
      }

      const audioBuffer = await response.arrayBuffer();

      if (audioBuffer.byteLength === 0) {
        throw new ElevenLabsError('Empty audio buffer received');
      }

      logger.info('TTS generated successfully', {
        audioSize: audioBuffer.byteLength,
      });

      return audioBuffer;
    } catch (error) {
      if (attempt < maxRetries) {
        logger.warn(
          `TTS generation failed (attempt ${attempt + 1}), retrying...`,
          error
        );
        // Wait a bit before retrying
        await new Promise((resolve) => setTimeout(resolve, 500));
      } else {
        logger.error('TTS generation failed after retries', error);
        throw error instanceof ElevenLabsError
          ? error
          : new ElevenLabsError(`Failed after ${maxRetries + 1} attempts: ${error}`);
      }
    }
  }

  throw new ElevenLabsError('Unexpected error in retry loop');
}

/**
 * Validate TTS requirements
 */
export function validateTTSInput(text: string): void {
  if (!text || text.trim().length === 0) {
    throw new ElevenLabsError('Text cannot be empty');
  }

  if (text.length > 5000) {
    throw new ElevenLabsError('Text too long (max 5000 characters)');
  }
}
