import { z } from 'zod';

/**
 * Zod Schemas for TaleWeaver API
 * Based on the spec's data contracts
 */

// ============================================================================
// Base Types
// ============================================================================

export const MoralFocusSchema = z.enum([
  'kindness',
  'honesty',
  'courage',
  'sharing',
  'perseverance',
]);

export const EmotionHintSchema = z.enum(['warm', 'curious', 'tense', 'relieved']);

export const ChoiceSchema = z.enum(['A', 'B']);

// ============================================================================
// Child Info
// ============================================================================

export const ChildSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(50, 'Name too long')
    .regex(/^[a-zA-Z\s'-]+$/, 'Name must contain only letters, spaces, hyphens, and apostrophes'),
  age: z.number().int().min(5, 'Age must be at least 5').max(11, 'Age must be at most 11'),
  interests: z
    .array(z.string().min(1).max(50))
    .max(5, 'Maximum 5 interests allowed')
    .default([]),
  context: z.string().max(120, 'Context must be 120 characters or less').optional(),
});

// ============================================================================
// Scene
// ============================================================================

export const SceneSchema = z.object({
  id: z.string(),
  text: z.string(),
  emotion_hint: EmotionHintSchema,
  audio_url: z.string().url(),
});

// ============================================================================
// Choice
// ============================================================================

export const ChoiceOptionsSchema = z.object({
  prompt: z.string(),
  options: z.tuple([z.string(), z.string()]), // Exactly 2 options (A/B)
});

// ============================================================================
// Ending / Reflection
// ============================================================================

export const EndingSchema = z.object({
  reflection: z.string(),
});

// ============================================================================
// Moral Meter
// ============================================================================

export const MoralMeterSchema = z.object({
  kind: z.number().min(0).max(1),
  honest: z.number().min(0).max(1),
  brave: z.number().min(0).max(1),
});

// ============================================================================
// API Request/Response Schemas
// ============================================================================

// POST /api/story/start - Request
export const StartRequestSchema = z.object({
  child: ChildSchema,
  moral_focus: MoralFocusSchema,
});

// POST /api/story/start - Response
export const StartResponseSchema = z.object({
  session_id: z.string().uuid(),
  scene: SceneSchema,
  choice: ChoiceOptionsSchema,
});

// POST /api/story/continue - Request
export const ContinueRequestSchema = z.object({
  session_id: z.string().uuid(),
  last_scene_id: z.string(),
  choice: ChoiceSchema,
});

// POST /api/story/continue - Response
export const ContinueResponseSchema = z.object({
  scene: SceneSchema,
  ending: EndingSchema,
  moral_meter: MoralMeterSchema,
});

// POST /api/tts (optional) - Request
export const TTSRequestSchema = z.object({
  session_id: z.string().uuid(),
  scene_id: z.string(),
  text: z.string(),
  emotion_hint: EmotionHintSchema,
});

// POST /api/tts (optional) - Response
export const TTSResponseSchema = z.object({
  audio_url: z.string().url(),
});

// ============================================================================
// Session Storage Schema (KV)
// ============================================================================

export const SessionSchema = z.object({
  session_id: z.string().uuid(),
  child: ChildSchema,
  moral_focus: MoralFocusSchema,
  scenes: z.array(SceneSchema),
  choices: z.array(ChoiceSchema),
  prior_summary: z.string(),
  meter: MoralMeterSchema,
  created_at: z.string().datetime(),
});

// ============================================================================
// Gemini Response Schemas (for strict JSON parsing)
// ============================================================================

export const GeminiStartResponseSchema = z.object({
  scene_text: z.string(),
  emotion_hint: EmotionHintSchema,
  choice: z.object({
    prompt: z.string(),
    options: z.tuple([z.string(), z.string()]),
  }),
});

export const GeminiContinueResponseSchema = z.object({
  scene_text: z.string(),
  emotion_hint: EmotionHintSchema,
  ending: z.object({
    reflection: z.string(),
  }),
});

// ============================================================================
// TypeScript Types (exported for use in code)
// ============================================================================

export type MoralFocus = z.infer<typeof MoralFocusSchema>;
export type EmotionHint = z.infer<typeof EmotionHintSchema>;
export type Choice = z.infer<typeof ChoiceSchema>;
export type Child = z.infer<typeof ChildSchema>;
export type Scene = z.infer<typeof SceneSchema>;
export type ChoiceOptions = z.infer<typeof ChoiceOptionsSchema>;
export type Ending = z.infer<typeof EndingSchema>;
export type MoralMeter = z.infer<typeof MoralMeterSchema>;
export type StartRequest = z.infer<typeof StartRequestSchema>;
export type StartResponse = z.infer<typeof StartResponseSchema>;
export type ContinueRequest = z.infer<typeof ContinueRequestSchema>;
export type ContinueResponse = z.infer<typeof ContinueResponseSchema>;
export type TTSRequest = z.infer<typeof TTSRequestSchema>;
export type TTSResponse = z.infer<typeof TTSResponseSchema>;
export type Session = z.infer<typeof SessionSchema>;
export type GeminiStartResponse = z.infer<typeof GeminiStartResponseSchema>;
export type GeminiContinueResponse = z.infer<typeof GeminiContinueResponseSchema>;
