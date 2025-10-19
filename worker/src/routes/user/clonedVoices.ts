/**
 * Cloned Voice Routes
 * POST /api/voices/clone - Clone a voice from audio
 * GET /api/voices/cloned - List user's cloned voices
 * DELETE /api/voices/cloned/:id - Delete a cloned voice
 */

import { Context } from 'hono';
import type { Env } from '../../types/env';
import type { ClonedVoice } from '../../schemas/auth/user';
import { CloneVoiceRequestSchema } from '../../schemas/auth/user';
import { requireAuthUser } from '../../auth/middleware';
import { cloneVoiceFromAudio, deleteVoiceFromElevenLabs } from '../../services/elevenlabs';
import { generateUUID } from '../../utils/validation';
import { ValidationError } from '../../utils/errors';
import { createLogger } from '../../utils/logger';

const logger = createLogger('Cloned Voice Routes');

const MAX_AUDIO_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * POST /api/voices/clone
 */
export async function handleCloneVoice(c: Context<{ Bindings: Env }>): Promise<Response> {
  try {
    const authUser = requireAuthUser(c);

    logger.info('Clone voice request', { userId: authUser.id });

    // Parse multipart form data
    const formData = await c.req.formData();
    const name = formData.get('name') as string;
    const audioFile = formData.get('audio') as File;

    // Validate name
    const validatedRequest = CloneVoiceRequestSchema.parse({ name });

    // Validate audio file
    if (!audioFile) {
      return c.json(
        {
          error: 'Validation Error',
          message: 'Audio file is required',
        },
        400
      );
    }

    // Check file size
    if (audioFile.size > MAX_AUDIO_SIZE) {
      return c.json(
        {
          error: 'Validation Error',
          message: `Audio file too large (max ${MAX_AUDIO_SIZE / 1024 / 1024}MB)`,
        },
        400
      );
    }

    // Check file type
    const validTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/m4a', 'audio/flac'];
    if (!validTypes.includes(audioFile.type)) {
      return c.json(
        {
          error: 'Validation Error',
          message: 'Invalid audio file type. Supported: mp3, wav, m4a, flac',
        },
        400
      );
    }

    // Convert file to ArrayBuffer
    const audioBuffer = await audioFile.arrayBuffer();

    // Clone voice via ElevenLabs
    const voiceId = await cloneVoiceFromAudio(audioBuffer, validatedRequest.name, c.env);

    // Store voice metadata in UserDO
    const id = c.env.USER_DO.idFromName('users');
    const userDO = c.env.USER_DO.get(id) as any;

    const now = new Date().toISOString();
    const clonedVoice: ClonedVoice = {
      id: generateUUID(),
      user_id: authUser.id,
      voice_id: voiceId,
      name: validatedRequest.name,
      created_at: now,
    };

    await userDO.createClonedVoice(clonedVoice);

    logger.info('Voice cloned and saved', {
      voiceId: clonedVoice.id,
      elevenLabsVoiceId: voiceId,
    });

    return c.json(
      {
        voice: clonedVoice,
      },
      201
    );
  } catch (error) {
    logger.error('Clone voice failed', error);

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
        error: 'Clone Failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
}

/**
 * GET /api/voices/cloned
 */
export async function handleListClonedVoices(
  c: Context<{ Bindings: Env }>
): Promise<Response> {
  try {
    const authUser = requireAuthUser(c);

    logger.info('List cloned voices', { userId: authUser.id });

    // Get Durable Object instance
    const id = c.env.USER_DO.idFromName('users');
    const userDO = c.env.USER_DO.get(id) as any;

    const voices = await userDO.getUserClonedVoices(authUser.id);

    return c.json({
      voices,
    });
  } catch (error) {
    logger.error('List cloned voices failed', error);
    return c.json(
      {
        error: 'Failed to List Voices',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
}

/**
 * DELETE /api/voices/cloned/:id
 */
export async function handleDeleteClonedVoice(
  c: Context<{ Bindings: Env }>
): Promise<Response> {
  try {
    const authUser = requireAuthUser(c);
    const voiceId = c.req.param('id');

    logger.info('Delete cloned voice', { userId: authUser.id, voiceId });

    // Get Durable Object instance
    const id = c.env.USER_DO.idFromName('users');
    const userDO = c.env.USER_DO.get(id) as any;

    // Get voice to retrieve ElevenLabs voice_id
    const voice = await userDO.getClonedVoice(voiceId);

    if (!voice) {
      return c.json(
        {
          error: 'Not Found',
          message: 'Cloned voice not found',
        },
        404
      );
    }

    // Check ownership
    if (voice.user_id !== authUser.id) {
      return c.json(
        {
          error: 'Forbidden',
          message: 'You do not have access to this voice',
        },
        403
      );
    }

    // Delete from ElevenLabs (don't fail if this fails)
    await deleteVoiceFromElevenLabs(voice.voice_id, c.env);

    // Delete from UserDO
    const success = await userDO.deleteClonedVoice(voiceId, authUser.id);

    if (!success) {
      return c.json(
        {
          error: 'Delete Failed',
          message: 'Failed to delete voice',
        },
        500
      );
    }

    logger.info('Cloned voice deleted', { voiceId });

    return c.json({
      message: 'Voice deleted successfully',
    });
  } catch (error) {
    logger.error('Delete cloned voice failed', error);
    return c.json(
      {
        error: 'Delete Failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
}
