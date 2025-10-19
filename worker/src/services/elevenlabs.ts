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
 * If DISABLE_TTS is set to 'true', returns a minimal silent audio buffer
 */
export async function generateTTS(
  text: string,
  emotionHint: EmotionHint,
  env: Env,
  maxRetries = 1
): Promise<ArrayBuffer> {
  // Check if TTS is disabled for testing
  if (env.DISABLE_TTS === 'true') {
    logger.info('TTS disabled - returning mock audio buffer');
    // Return a minimal WAV file (44 bytes header + silent audio)
    // This is a valid 1-second silent WAV file at 8kHz mono
    const silentWav = new Uint8Array([
      0x52, 0x49, 0x46, 0x46, // "RIFF"
      0x24, 0x00, 0x00, 0x00, // File size - 8
      0x57, 0x41, 0x56, 0x45, // "WAVE"
      0x66, 0x6d, 0x74, 0x20, // "fmt "
      0x10, 0x00, 0x00, 0x00, // Subchunk1Size (16 for PCM)
      0x01, 0x00,             // AudioFormat (1 for PCM)
      0x01, 0x00,             // NumChannels (1 = mono)
      0x40, 0x1f, 0x00, 0x00, // SampleRate (8000 Hz)
      0x40, 0x1f, 0x00, 0x00, // ByteRate
      0x01, 0x00,             // BlockAlign
      0x08, 0x00,             // BitsPerSample (8 bits)
      0x64, 0x61, 0x74, 0x61, // "data"
      0x00, 0x00, 0x00, 0x00  // Subchunk2Size (0 bytes of audio)
    ]);
    return silentWav.buffer;
  }

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
