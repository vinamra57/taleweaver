/**
 * POST /api/song/start
 * Creates a new song/rhyme session (non-interactive)
 */

import { Context } from 'hono';
import type { Env } from '../types/env';
import {
  StartSongRequestSchema,
  StartSongResponse,
  SongSession,
} from '../schemas/song';
import { generateSongPrompt } from '../services/gemini';
import { generateMusic, validateMusicInput } from '../services/elevenlabsMusic';
import { uploadAudio, getAudioUrl } from '../services/r2';
import { buildSongGenerationPrompt } from '../prompts/songGeneration';
import { generateUUID } from '../utils/validation';
import { ValidationError } from '../utils/errors';
import { createLogger } from '../utils/logger';

const logger = createLogger('Song Start Route');

/**
 * Save song session to KV (similar to saveSession but for songs)
 */
async function saveSongSession(
  session: SongSession,
  env: Env
): Promise<void> {
  try {
    logger.debug(`Saving song session: ${session.session_id}`);

    // Calculate TTL in seconds (default: 12 hours)
    const ttlHours = parseInt(env.SESSION_TTL_HOURS || '12', 10);
    const ttlSeconds = ttlHours * 60 * 60;

    // Save to KV with expiration - use a different prefix for songs
    await env.TALEWEAVER_SESSIONS.put(
      `song_${session.session_id}`,
      JSON.stringify(session),
      {
        expirationTtl: ttlSeconds,
      }
    );

    logger.info(
      `Song session saved successfully: ${session.session_id} (TTL: ${ttlHours}h)`
    );
  } catch (error) {
    logger.error(`Failed to save song session: ${session.session_id}`, error);
    throw new Error(`Failed to save song session: ${error}`);
  }
}

export async function handleSongStart(c: Context): Promise<Response> {
  const env = c.env as Env;

  try {
    // Parse and validate request body
    const body = await c.req.json();
    const validatedRequest = StartSongRequestSchema.parse(body);

    logger.info('Starting new song generation', {
      name: validatedRequest.child.name,
      age: validatedRequest.child.age_range,
      type: validatedRequest.song_type,
      theme: validatedRequest.theme,
      length: validatedRequest.song_length,
    });

    // Generate session ID
    const sessionId = generateUUID();

    // Get worker URL from request
    const workerUrl = new URL(c.req.url).origin;

    // ========================================================================
    // PHASE 1: Generate song lyrics and music prompt using Gemini
    // ========================================================================

    const songPrompt = buildSongGenerationPrompt(
      validatedRequest.child,
      validatedRequest.song_type,
      validatedRequest.theme,
      validatedRequest.moral_focus,
      validatedRequest.song_length
    );

    const songResponse = await generateSongPrompt(songPrompt, env);
    const lyricsText = songResponse.lyrics_text || '';
    const musicPrompt = songResponse.music_prompt;

    logger.info('Song lyrics and music prompt generated', {
      theme: songResponse.song_theme,
      hasLyrics: !!lyricsText,
      musicPromptLength: musicPrompt.length,
    });

    // ========================================================================
    // PHASE 2: Generate music using ElevenLabs Music API
    // ========================================================================

    // Calculate duration in milliseconds (1, 2, or 3 minutes)
    const durationMs = validatedRequest.song_length * 60 * 1000;

    // Validate music input
    validateMusicInput(musicPrompt, durationMs);

    // Determine if instrumental (no lyrics)
    const forceInstrumental = !lyricsText || lyricsText.trim().length === 0;

    logger.info('Generating music', { durationMs, forceInstrumental });

    // Generate music
    const audioBuffer = await generateMusic(
      musicPrompt,
      durationMs,
      env,
      forceInstrumental
    );

    logger.info('Music generated successfully', {
      audioSize: audioBuffer.byteLength,
    });

    // ========================================================================
    // PHASE 3: Upload audio to R2
    // ========================================================================

    const audioKey = await uploadAudio(sessionId, 'song', audioBuffer, env);
    const audioUrl = getAudioUrl(audioKey, env, workerUrl);

    logger.info('Song audio uploaded', { audioKey, audioUrl });

    // ========================================================================
    // PHASE 4: Create and save session
    // ========================================================================

    const session: SongSession = {
      session_id: sessionId,
      child: validatedRequest.child,
      song_type: validatedRequest.song_type,
      theme: validatedRequest.theme,
      moral_focus: validatedRequest.moral_focus,
      song_length: validatedRequest.song_length,
      music_prompt: musicPrompt,
      lyrics_text: lyricsText || undefined,
      voice_selection: validatedRequest.voice_selection,
      audio_url: audioUrl,
      created_at: new Date().toISOString(),
    };

    await saveSongSession(session, env);

    // ========================================================================
    // PHASE 5: Build and return response
    // ========================================================================

    const response: StartSongResponse = {
      session_id: sessionId,
      audio_url: audioUrl,
      lyrics_text: lyricsText || undefined,
      song_complete: true, // Songs are always complete (no branching)
    };

    logger.info('Song created successfully', { sessionId });
    return c.json(response, 200);
  } catch (error) {
    logger.error('Song creation failed', error);

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
        error: 'Song Generation Failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
}
