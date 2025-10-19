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
 * @param voiceId - Optional custom voice ID. If not provided, uses env.ELEVENLABS_VOICE_ID
 */
export async function generateTTS(
  text: string,
  emotionHint: EmotionHint,
  env: Env,
  voiceId?: string,
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

      const selectedVoiceId = voiceId || env.ELEVENLABS_VOICE_ID;
      const modelId = env.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2';
      const voiceSettings = VOICE_SETTINGS[emotionHint] || VOICE_SETTINGS.warm;

      const response = await fetch(
        `${ELEVENLABS_API_URL}/${selectedVoiceId}`,
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
 * Generate a custom voice from a text description
 * Returns voice ID to use for TTS
 * Falls back to default voice if generation fails
 */
export async function generateVoiceFromDescription(
  description: string,
  env: Env,
  maxRetries = 1
): Promise<string> {
  const defaultVoiceId = env.ELEVENLABS_VOICE_ID;

  // Check if TTS is disabled for testing
  if (env.DISABLE_TTS === 'true') {
    logger.info('TTS disabled - returning default voice ID');
    return defaultVoiceId;
  }

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      logger.debug(
        `Generating voice from description (attempt ${attempt + 1}/${maxRetries + 1})`,
        { description }
      );

      // Step 1: Generate voice previews using correct endpoint
      // Use the voice description itself as preview text (Gemini generates 100+ char descriptions)
      const generateResponse = await fetch(
        'https://api.elevenlabs.io/v1/text-to-voice/create-previews',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'xi-api-key': env.ELEVENLABS_API_KEY,
          },
          body: JSON.stringify({
            voice_description: description,
            text: description, // Use the description itself as preview text (100+ chars)
          }),
        }
      );

      if (!generateResponse.ok) {
        const errorText = await generateResponse.text();
        throw new ElevenLabsError(
          `Voice generation API returned ${generateResponse.status}: ${errorText}`
        );
      }

      const generateData = (await generateResponse.json()) as any;
      const previews = generateData.previews;

      if (!previews || !Array.isArray(previews) || previews.length === 0) {
        throw new ElevenLabsError('No voice previews generated in response');
      }

      // Use the first preview's generated_voice_id
      const generatedVoiceId = previews[0].generated_voice_id;

      if (!generatedVoiceId) {
        throw new ElevenLabsError('No generated_voice_id in first preview');
      }

      logger.info('Voice preview generated successfully', {
        generatedVoiceId,
        previewCount: previews.length
      });

      // Step 2: Add the voice to library to make it permanent and usable for TTS
      const addToLibraryResponse = await fetch(
        'https://api.elevenlabs.io/v1/text-to-voice',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'xi-api-key': env.ELEVENLABS_API_KEY,
          },
          body: JSON.stringify({
            voice_name: `TaleWeaver-${Date.now()}`, // Unique name for the voice
            voice_description: description, // Description for the voice
            generated_voice_id: generatedVoiceId, // The temporary voice ID from previews
          }),
        }
      );

      if (!addToLibraryResponse.ok) {
        const errorText = await addToLibraryResponse.text();
        throw new ElevenLabsError(
          `Failed to add voice to library (${addToLibraryResponse.status}): ${errorText}`
        );
      }

      const addToLibraryData = (await addToLibraryResponse.json()) as any;
      const permanentVoiceId = addToLibraryData.voice_id;

      if (!permanentVoiceId) {
        throw new ElevenLabsError('No voice_id returned from add-to-library');
      }

      logger.info('Voice added to library successfully', {
        temporaryId: generatedVoiceId,
        permanentId: permanentVoiceId
      });

      return permanentVoiceId;
    } catch (error) {
      if (attempt < maxRetries) {
        logger.warn(
          `Voice generation failed (attempt ${attempt + 1}), retrying...`,
          error
        );
        await new Promise((resolve) => setTimeout(resolve, 500));
      } else {
        logger.error('Voice generation failed after retries, using default voice', error);
        // Return default voice as fallback
        return defaultVoiceId;
      }
    }
  }

  // Fallback to default voice
  logger.warn('Falling back to default voice');
  return defaultVoiceId;
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
