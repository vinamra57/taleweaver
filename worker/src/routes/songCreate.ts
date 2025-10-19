/**
 * POST /api/song/create
 * Generates a non-interactive song using Gemini + ElevenLabs Music
 */

import { Context } from 'hono';
import type { Env } from '../types/env';
import {
  SongRequestSchema,
  SongResponse,
} from '../schemas/song';
import { buildSongPromptGenerationPrompt, buildSongCompositionPlanPrompt, getTempoGuidanceLines } from '../prompts/songGeneration';
import { generateSongPrompt, generateSongCompositionPlan } from '../services/gemini';
import {
  composeMusic,
  validateMusicInput,
  generateCompositionPlan,
  composeMusicFromPlan,
} from '../services/music';
import { uploadAudio, getAudioUrl } from '../services/r2';
import { saveSongSession } from '../services/songSessions';
import { generateUUID } from '../utils/validation';
import { ValidationError } from '../utils/errors';
import { createLogger } from '../utils/logger';
import { PRESET_VOICES, getVocalTags } from '../constants/voices';
import { ZodError } from 'zod';

const logger = createLogger('Song Create Route');

function buildVoiceDescriptor(selection: string): string {
  if (selection === 'custom') {
    return 'a warm, friendly adult vocalist with clear articulation suited for children';
  }

  const preset = PRESET_VOICES[selection as keyof typeof PRESET_VOICES];

  if (!preset) {
    return 'a warm, friendly adult vocalist with clear articulation suited for children';
  }

  return preset.description;
}

export async function handleSongCreate(c: Context): Promise<Response> {
  const env = c.env as Env;

  try {
    const body = await c.req.json();
    const validatedRequest = SongRequestSchema.parse(body);

    logger.info('Creating song', {
      childName: validatedRequest.child_name,
      songType: validatedRequest.song_type,
      theme: validatedRequest.theme,
      moralFocus: validatedRequest.moral_focus,
      musicalStyle: validatedRequest.musical_style,
      length: validatedRequest.song_length,
    });

    const sessionId = generateUUID();
    const songLengthMs = validatedRequest.song_length * 1000;
    const forceInstrumental = validatedRequest.song_type === 'instrumental';

    // ========================================================================
    // Step 1: Generate detailed song prompt with Gemini
    // ========================================================================
    const geminiPrompt = buildSongPromptGenerationPrompt(
      validatedRequest.child_name,
      validatedRequest.song_type,
      validatedRequest.theme,
      validatedRequest.moral_focus,
      validatedRequest.musical_style,
      validatedRequest.song_length
    );

    const songMetadata = await generateSongPrompt(geminiPrompt, env);

    logger.info('Song prompt received from Gemini', {
      title: songMetadata.title,
      hasLyricsPreview: Boolean(songMetadata.lyrics_preview),
    });

    const voiceDescriptor = buildVoiceDescriptor(
      validatedRequest.voice_selection || 'custom'
    );

    // Combine Gemini prompt with additional constraints for planning/composition
    const basePrompt = [
      songMetadata.song_prompt,
      `Song specifications:`,
      `- Target audience: children aged 4-10, featuring the name ${validatedRequest.child_name}`,
      `- Moral focus: ${validatedRequest.moral_focus}`,
      `- Duration: approximately ${validatedRequest.song_length} seconds`,
      forceInstrumental
        ? '- Instrumental only. No vocals or lyrics.'
        : `- Vocal style: ${voiceDescriptor}`,
      `- Musical style: ${validatedRequest.musical_style}`,
      validatedRequest.song_type === 'rhyme'
        ? '- Structure: playful rhyming couplets with memorable hook.'
        : '- Structure: engaging verses with a memorable chorus.',
    ].join('\n');

    validateMusicInput(basePrompt, songLengthMs);

    let audioBuffer: ArrayBuffer;
    let finalLyrics: string | undefined = songMetadata.lyrics_preview;

    if (!forceInstrumental) {
      // 1) Try Gemini-authored plan with explicit sections+lines (best alignment)
      try {
        const planPrompt = buildSongCompositionPlanPrompt(
          validatedRequest.child_name,
          validatedRequest.song_type,
          validatedRequest.theme,
          validatedRequest.moral_focus,
          validatedRequest.musical_style,
          validatedRequest.song_length,
          voiceDescriptor,
          getVocalTags(validatedRequest.voice_selection || 'custom')
        );
        const geminiPlan = await generateSongCompositionPlan(planPrompt, env);

        // Extract lyrics for UI
        const sections = (geminiPlan as any).sections || [];
        const lines: string[] = sections.flatMap((s: any) => s?.lines || []);
        if (lines.length > 0) {
          finalLyrics = lines.join('\n');
        }

        audioBuffer = await composeMusicFromPlan(
          geminiPlan,
          false,
          env
        );
      } catch (e) {
        // 2) Fallback to ElevenLabs-generated plan if Gemini plan fails
        const seedTags = getVocalTags(validatedRequest.voice_selection || 'custom');
        const planPrompt = [
          basePrompt,
          songMetadata.lyrics_preview
            ? `\nInclude and align to this lyrical hook/verse: \n${songMetadata.lyrics_preview}`
            : '',
          seedTags && seedTags.length
            ? `Singer tags (include all within styles): [${seedTags.join(', ')}]`
            : '',
          getTempoGuidanceLines(
            validatedRequest.theme,
            validatedRequest.musical_style,
            validatedRequest.song_length
          ),
          'Return a composition plan with sections and lines suitable for children.',
        ].join('\n');

        const plan = await generateCompositionPlan(planPrompt, songLengthMs, env);
        try {
          const sections = (plan as any).sections || [];
          const lines: string[] = sections.flatMap((s: any) => s?.lines || []);
          if (lines.length > 0) {
            finalLyrics = lines.join('\n');
          }
        } catch {}

        audioBuffer = await composeMusicFromPlan(plan, false, env);
      }
    } else {
      // Instrumental: prompt-only is fine
      audioBuffer = await composeMusic(basePrompt, songLengthMs, true, env);
    }

    // ========================================================================
    // Step 3: Upload to R2 and persist session
    // ========================================================================
    const audioKey = await uploadAudio(sessionId, 'song', audioBuffer, env);
    const workerUrl = new URL(c.req.url).origin;
    const audioUrl = getAudioUrl(audioKey, env, workerUrl);

    await saveSongSession(
      {
        session_id: sessionId,
        child_name: validatedRequest.child_name,
        song_type: validatedRequest.song_type,
        theme: validatedRequest.theme,
        moral_focus: validatedRequest.moral_focus,
        song_length: validatedRequest.song_length,
        voice_selection: validatedRequest.voice_selection,
        musical_style: validatedRequest.musical_style,
        title: songMetadata.title,
        lyrics: finalLyrics,
        audio_url: audioUrl,
        duration_seconds: validatedRequest.song_length,
        created_at: new Date().toISOString(),
      },
      env
    );

    const responseBody: SongResponse = {
      session_id: sessionId,
      audio_url: audioUrl,
      lyrics: finalLyrics,
      title: songMetadata.title,
      duration_seconds: validatedRequest.song_length,
    };

    logger.info('Song created successfully', { sessionId });
    return c.json(responseBody, 200);
  } catch (error) {
    logger.error('Failed to create song', error);

    if (error instanceof ZodError) {
      const message = error.issues?.[0]?.message || 'Invalid request payload';
      return c.json(
        {
          error: 'Validation Error',
          message,
        },
        400
      );
    }

    if (error instanceof ValidationError) {
      return c.json({ error: error.message }, 400);
    }

    if (error instanceof Error && 'name' in error && 'message' in error) {
      return c.json(
        { error: error.name, message: error.message },
        (error as any).statusCode || 500
      );
    }

    return c.json(
      {
        error: 'SongGenerationError',
        message: 'Failed to generate song',
      },
      500
    );
  }
}
