import { z } from 'zod';
import { MoralFocusSchema, VoiceSelectionSchema } from './story';

/**
 * Zod Schemas for TaleWeaver Song/Music API
 * Children's songs and rhymes with customizable themes
 */

// ============================================================================
// Base Types
// ============================================================================

export const SongTypeSchema = z.enum(['song', 'rhyme', 'instrumental']);

export const SongThemeSchema = z.enum([
  'bedtime',
  'adventure',
  'learning',
  'celebration',
  'friendship',
]);

export const SongLengthSchema = z.union([
  z.literal(30),
  z.literal(60),
  z.literal(120),
]);

export const MusicalStyleSchema = z.enum([
  'lullaby',
  'pop',
  'folk',
  'classical',
  'jazz',
]);

// ============================================================================
// API Request/Response Schemas
// ============================================================================

// POST /api/song/create - Request
export const SongRequestSchema = z.object({
  child_name: z
    .string()
    .min(1, 'Name is required')
    .max(50, 'Name too long')
    .regex(/^[a-zA-Z\s'-]+$/, 'Name must contain only letters, spaces, hyphens, and apostrophes'),
  song_type: SongTypeSchema,
  theme: SongThemeSchema,
  moral_focus: MoralFocusSchema,
  song_length: SongLengthSchema, // in seconds
  voice_selection: VoiceSelectionSchema.optional().default('custom'),
  musical_style: MusicalStyleSchema,
});

// POST /api/song/create - Response
export const SongResponseSchema = z.object({
  session_id: z.string().uuid(),
  audio_url: z.string().url(),
  lyrics: z.string().optional(), // Only if not instrumental
  title: z.string(),
  duration_seconds: z.number(),
});

// ============================================================================
// Session Storage Schema (KV)
// ============================================================================

export const SongSessionSchema = z.object({
  session_id: z.string().uuid(),
  child_name: z.string(),
  song_type: SongTypeSchema,
  theme: SongThemeSchema,
  moral_focus: MoralFocusSchema,
  song_length: SongLengthSchema,
  voice_selection: VoiceSelectionSchema.optional(),
  musical_style: MusicalStyleSchema,

  // Generated content
  title: z.string(),
  lyrics: z.string().optional(),
  audio_url: z.string().url(),
  duration_seconds: z.number(),

  // Metadata
  created_at: z.string().datetime(),
});

// ============================================================================
// Gemini Response Schema
// ============================================================================

export const GeminiSongPromptResponseSchema = z.object({
  title: z.string(),
  song_prompt: z.string(), // Detailed prompt for ElevenLabs
  lyrics_preview: z.string().optional(), // Preview of lyrics (if not instrumental)
});

// ============================================================================
// ElevenLabs Music API Types
// ============================================================================

export const MusicPromptSchema = z.object({
  positive_global_styles: z.array(z.string()),
  negative_global_styles: z.array(z.string()),
  sections: z.array(z.object({
    section_name: z.string(),
    positive_local_styles: z.array(z.string()),
    negative_local_styles: z.array(z.string()),
    duration_ms: z.number().int(),
    lines: z.array(z.string()),
  })),
});

// ============================================================================
// TypeScript Types (exported for use in code)
// ============================================================================

export type SongType = z.infer<typeof SongTypeSchema>;
export type SongTheme = z.infer<typeof SongThemeSchema>;
export type SongLength = z.infer<typeof SongLengthSchema>;
export type MusicalStyle = z.infer<typeof MusicalStyleSchema>;
export type SongRequest = z.infer<typeof SongRequestSchema>;
export type SongResponse = z.infer<typeof SongResponseSchema>;
export type SongSession = z.infer<typeof SongSessionSchema>;
export type GeminiSongPromptResponse = z.infer<typeof GeminiSongPromptResponseSchema>;
export type MusicPrompt = z.infer<typeof MusicPromptSchema>;
