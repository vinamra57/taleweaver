/**
 * ElevenLabs Music Service
 * Handles song/music generation using ElevenLabs Music API
 */

import type { Env } from '../types/env';
import type { MusicPrompt } from '../schemas/song';
import { MusicError } from '../utils/errors';
import { createLogger } from '../utils/logger';

const logger = createLogger('Music Service');

const ELEVENLABS_MUSIC_API_URL = 'https://api.elevenlabs.io/v1/music';
const ELEVENLABS_MUSIC_PLAN_API_URL = 'https://api.elevenlabs.io/v1/music/plan';

/**
 * Compose music directly from a text prompt
 * This is the simplest approach - let ElevenLabs handle the composition
 */
export async function composeMusic(
  prompt: string,
  lengthMs: number,
  forceInstrumental: boolean,
  env: Env,
  maxRetries = 1
): Promise<ArrayBuffer> {
  // Check if music generation is disabled for testing
  if (env.DISABLE_TTS === 'true') {
    logger.info('Music generation disabled - returning mock audio buffer');
    // Return a minimal WAV file (same as TTS mock)
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
        `Generating music (attempt ${attempt + 1}/${maxRetries + 1})`,
        {
          promptLength: prompt.length,
          lengthMs,
          forceInstrumental,
        }
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
            music_length_ms: lengthMs,
            model_id: 'music_v1',
            force_instrumental: forceInstrumental,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new MusicError(
          `Music API returned ${response.status}: ${errorText}`
        );
      }

      const audioBuffer = await response.arrayBuffer();

      if (audioBuffer.byteLength === 0) {
        throw new MusicError('Empty audio buffer received');
      }

      logger.info('Music generated successfully', {
        audioSize: audioBuffer.byteLength,
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
        throw error instanceof MusicError
          ? error
          : new MusicError(`Failed after ${maxRetries + 1} attempts: ${error}`);
      }
    }
  }

  throw new MusicError('Unexpected error in retry loop');
}

/**
 * Validate music generation inputs
 */
export function validateMusicInput(prompt: string, lengthMs: number): void {
  if (!prompt || prompt.trim().length === 0) {
    throw new MusicError('Prompt cannot be empty');
  }

  if (prompt.length > 2000) {
    throw new MusicError('Prompt too long (max 2000 characters)');
  }

  // ElevenLabs music API supports 10s - 5min (10000ms - 300000ms)
  if (lengthMs < 10000 || lengthMs > 300000) {
    throw new MusicError('Music length must be between 10s and 5 minutes');
  }
}

/**
 * Create a composition plan using ElevenLabs (free, rate-limited)
 */
export async function generateCompositionPlan(
  prompt: string,
  lengthMs: number,
  env: Env
): Promise<MusicPrompt> {
  try {
    const response = await fetch(ELEVENLABS_MUSIC_PLAN_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': env.ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        prompt,
        music_length_ms: lengthMs,
        model_id: 'music_v1',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new MusicError(`Plan API returned ${response.status}: ${errorText}`);
    }

    const plan = (await response.json()) as MusicPrompt;
    logger.info('Composition plan generated', {
      sections: Array.isArray((plan as any).sections)
        ? (plan as any).sections.length
        : 0,
    });
    return plan;
  } catch (error) {
    throw error instanceof MusicError
      ? error
      : new MusicError(`Failed to create composition plan: ${error}`);
  }
}

/**
 * Compose music from a composition plan for better lyric/structure alignment
 */
export async function composeMusicFromPlan(
  compositionPlan: MusicPrompt,
  forceInstrumental: boolean,
  env: Env,
  maxRetries = 1
): Promise<ArrayBuffer> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(
        `${ELEVENLABS_MUSIC_API_URL}?output_format=mp3_44100_128`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'xi-api-key': env.ELEVENLABS_API_KEY,
          },
          body: JSON.stringify({
            composition_plan: compositionPlan,
            model_id: 'music_v1',
            force_instrumental: forceInstrumental,
            respect_sections_durations: true,
            store_for_inpainting: false,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new MusicError(
          `Music API (plan) returned ${response.status}: ${errorText}`
        );
      }

      const audioBuffer = await response.arrayBuffer();
      if (audioBuffer.byteLength === 0) {
        throw new MusicError('Empty audio buffer received (plan)');
      }

      logger.info('Music composed from plan successfully', {
        audioSize: audioBuffer.byteLength,
      });
      return audioBuffer;
    } catch (error) {
      if (attempt < maxRetries) {
        logger.warn(
          `Plan-based music generation failed (attempt ${attempt + 1}), retrying...`,
          error
        );
        await new Promise((r) => setTimeout(r, 1000));
      } else {
        throw error instanceof MusicError
          ? error
          : new MusicError(`Plan-based compose failed: ${error}`);
      }
    }
  }

  throw new MusicError('Unexpected error in plan-based compose retry loop');
}
