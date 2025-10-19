/**
 * R2 Service - Audio and Image File Storage
 * Handles uploading MP3 and PNG files to Cloudflare R2 and generating public URLs
 */

import type { Env } from '../types/env';
import { StorageError } from '../utils/errors';
import { createLogger } from '../utils/logger';

const logger = createLogger('R2 Service');

/**
 * Upload audio file to R2
 * Returns the key used for storage
 */
export async function uploadAudio(
  sessionId: string,
  sceneId: string,
  audioBuffer: ArrayBuffer,
  env: Env
): Promise<string> {
  try {
    const key = `${sessionId}/${sceneId}.mp3`;

    logger.debug(`Uploading audio to R2: ${key}`, {
      size: audioBuffer.byteLength,
    });

    await env.AUDIO_BUCKET.put(key, audioBuffer, {
      httpMetadata: {
        contentType: 'audio/mpeg',
      },
    });

    logger.info(`Audio uploaded successfully: ${key}`);
    return key;
  } catch (error) {
    logger.error(`Failed to upload audio: ${sessionId}/${sceneId}`, error);
    throw new StorageError(
      `Failed to upload audio: ${error}`,
      'R2'
    );
  }
}

/**
 * Get public URL for audio file
 * If R2_PUBLIC_URL is configured, use it; otherwise, generate a Worker proxy URL
 */
export function getAudioUrl(
  key: string,
  env: Env,
  workerUrl?: string
): string {
  // If public R2 URL is configured, use it
  if (env.R2_PUBLIC_URL) {
    return `${env.R2_PUBLIC_URL}/${key}`;
  }

  // Otherwise, use Worker proxy URL
  if (workerUrl) {
    return `${workerUrl}/audio/${key}`;
  }

  // Fallback: return a placeholder
  logger.warn('No R2_PUBLIC_URL or workerUrl configured, using placeholder');
  return `/audio/${key}`;
}

/**
 * Get audio file from R2
 * Returns the audio buffer
 */
export async function getAudio(
  key: string,
  env: Env
): Promise<ArrayBuffer | null> {
  try {
    logger.debug(`Fetching audio from R2: ${key}`);

    const object = await env.AUDIO_BUCKET.get(key);

    if (!object) {
      logger.warn(`Audio not found: ${key}`);
      return null;
    }

    const audioBuffer = await object.arrayBuffer();
    logger.info(`Audio retrieved successfully: ${key}`);

    return audioBuffer;
  } catch (error) {
    logger.error(`Failed to retrieve audio: ${key}`, error);
    throw new StorageError(`Failed to retrieve audio: ${error}`, 'R2');
  }
}

/**
 * Delete audio file from R2
 */
export async function deleteAudio(
  key: string,
  env: Env
): Promise<void> {
  try {
    logger.debug(`Deleting audio from R2: ${key}`);
    await env.AUDIO_BUCKET.delete(key);
    logger.info(`Audio deleted: ${key}`);
  } catch (error) {
    logger.error(`Failed to delete audio: ${key}`, error);
    throw new StorageError(`Failed to delete audio: ${error}`, 'R2');
  }
}

/**
 * Delete all audio files for a session
 */
export async function deleteSessionAudio(
  sessionId: string,
  env: Env
): Promise<void> {
  try {
    logger.debug(`Deleting all audio for session: ${sessionId}`);

    const listed = await env.AUDIO_BUCKET.list({
      prefix: `${sessionId}/`,
    });

    for (const object of listed.objects) {
      await env.AUDIO_BUCKET.delete(object.key);
    }

    logger.info(`All audio deleted for session: ${sessionId}`);
  } catch (error) {
    logger.error(`Failed to delete session audio: ${sessionId}`, error);
    throw new StorageError(
      `Failed to delete session audio: ${error}`,
      'R2'
    );
  }
}

// ============================================================================
// Image Functions (mirroring audio functions above)
// ============================================================================

/**
 * Upload image file to R2
 * Returns the key used for storage
 * Mirrors uploadAudio()
 */
export async function uploadImage(
  sessionId: string,
  sceneId: string,
  imageBuffer: ArrayBuffer,
  env: Env
): Promise<string> {
  try {
    const key = `${sessionId}/${sceneId}.png`;

    logger.debug(`Uploading image to R2: ${key}`, {
      size: imageBuffer.byteLength,
    });

    await env.AUDIO_BUCKET.put(key, imageBuffer, {
      httpMetadata: {
        contentType: 'image/png',
      },
    });

    logger.info(`Image uploaded successfully: ${key}`);
    return key;
  } catch (error) {
    logger.error(`Failed to upload image: ${sessionId}/${sceneId}`, error);
    throw new StorageError(
      `Failed to upload image: ${error}`,
      'R2'
    );
  }
}

/**
 * Get public URL for image file
 * If R2_PUBLIC_URL is configured, use it; otherwise, generate a Worker proxy URL
 * Mirrors getAudioUrl()
 */
export function getImageUrl(
  key: string,
  env: Env,
  workerUrl?: string
): string {
  // If public R2 URL is configured, use it
  if (env.R2_PUBLIC_URL) {
    return `${env.R2_PUBLIC_URL}/${key}`;
  }

  // Otherwise, use Worker proxy URL
  if (workerUrl) {
    return `${workerUrl}/image/${key}`;
  }

  // Fallback: return a placeholder
  logger.warn('No R2_PUBLIC_URL or workerUrl configured, using placeholder');
  return `/image/${key}`;
}

/**
 * Get image file from R2
 * Returns the image buffer
 * Mirrors getAudio()
 */
export async function getImage(
  key: string,
  env: Env
): Promise<ArrayBuffer | null> {
  try {
    logger.debug(`Fetching image from R2: ${key}`);

    const object = await env.AUDIO_BUCKET.get(key);

    if (!object) {
      logger.warn(`Image not found: ${key}`);
      return null;
    }

    const imageBuffer = await object.arrayBuffer();
    logger.info(`Image retrieved successfully: ${key}`);

    return imageBuffer;
  } catch (error) {
    logger.error(`Failed to retrieve image: ${key}`, error);
    throw new StorageError(`Failed to retrieve image: ${error}`, 'R2');
  }
}
