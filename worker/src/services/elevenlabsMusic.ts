/**
 * ElevenLabs Music Service - Music Generation
 * Generates songs and musical rhymes for children
 */

import type { Env } from '../types/env';
import { ElevenLabsError } from '../utils/errors';
import { createLogger } from '../utils/logger';

const logger = createLogger('ElevenLabs Music Service');

const ELEVENLABS_MUSIC_API_URL = 'https://api.elevenlabs.io/v1/music';

/**
 * Generate music with ElevenLabs Music API
 * Returns audio as ArrayBuffer
 * If DISABLE_TTS is set to 'true', returns a minimal silent audio buffer
 */
export async function generateMusic(
  prompt: string,
  durationMs: number,
  env: Env,
  forceInstrumental: boolean = false,
  maxRetries = 1
): Promise<ArrayBuffer> {
  // Check if TTS/Music generation is disabled for testing
  if (env.DISABLE_TTS === 'true') {
    logger.info('Music generation disabled - returning mock audio buffer');
    // Return a minimal WAV file (44 bytes header + silent audio)
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

  // Validate duration
  if (durationMs < 3000 || durationMs > 300000) {
    throw new ElevenLabsError('Duration must be between 3000ms (3s) and 300000ms (5min)');
  }

  // Validate prompt length
  if (prompt.length > 2000) {
    throw new ElevenLabsError('Music prompt too long (max 2000 characters)');
  }

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      logger.debug(
        `Generating music (attempt ${attempt + 1}/${maxRetries + 1})`,
        { durationMs, promptLength: prompt.length, forceInstrumental }
      );

      const response = await fetch(
        `${ELEVENLABS_MUSIC_API_URL}?output_format=mp3_44100_128`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'xi-api-key': env.ELEVENLABS_API_KEY,
          },
          body: JSON.stringify({
            prompt,
            music_length_ms: durationMs,
            model_id: 'music_v1',
            force_instrumental: forceInstrumental,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new ElevenLabsError(
          `Music API returned ${response.status}: ${errorText}`
        );
      }

      const audioBuffer = await response.arrayBuffer();

      if (audioBuffer.byteLength === 0) {
        throw new ElevenLabsError('Empty audio buffer received from music API');
      }

      logger.info('Music generated successfully', {
        audioSize: audioBuffer.byteLength,
        durationMs,
      });

      return audioBuffer;
    } catch (error) {
      if (attempt < maxRetries) {
        logger.warn(
          `Music generation failed (attempt ${attempt + 1}), retrying...`,
          error
        );
        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } else {
        logger.error('Music generation failed after retries', error);
        throw error instanceof ElevenLabsError
          ? error
          : new ElevenLabsError(`Failed after ${maxRetries + 1} attempts: ${error}`);
      }
    }
  }

  throw new ElevenLabsError('Unexpected error in retry loop');
}

/**
 * Validate music generation input
 */
export function validateMusicInput(prompt: string, durationMs: number): void {
  if (!prompt || prompt.trim().length === 0) {
    throw new ElevenLabsError('Music prompt cannot be empty');
  }

  if (prompt.length > 2000) {
    throw new ElevenLabsError('Music prompt too long (max 2000 characters)');
  }

  if (durationMs < 3000 || durationMs > 300000) {
    throw new ElevenLabsError('Duration must be between 3000ms and 300000ms');
  }
}
