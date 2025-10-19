import { z } from 'zod';

/**
 * Zod Schemas for TaleWeaver API (Branching Interactive Stories)
 * Updated to match new architecture with checkpoints and pre-generation
 */

// ============================================================================
// Base Types
// ============================================================================

export const GenderSchema = z.enum(['male', 'female']);

export const AgeRangeSchema = z.enum(['4-6', '7-9', '10-12']);

export const StoryLengthSchema = z.union([z.literal(1), z.literal(2), z.literal(3)]);

export const MoralFocusSchema = z.enum([
  'kindness',
  'honesty',
  'courage',
  'sharing',
  'perseverance',
]);

export const BranchChoiceSchema = z.enum(['A', 'B']);

export const VoiceSelectionSchema = z.enum(['custom', 'princess', 'scientist', 'pirate', 'coach', 'explorer']);

// ============================================================================
// Child Info
// ============================================================================

export const ChildSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(50, 'Name too long')
    .regex(/^[a-zA-Z\s'-]+$/, 'Name must contain only letters, spaces, hyphens, and apostrophes'),
  gender: GenderSchema,
  age_range: AgeRangeSchema,
  interests: z.string().min(1, 'Interests required').max(500, 'Interests too long'),
  context: z.string().max(200, 'Context must be 200 characters or less').optional(),
});

// ============================================================================
// Story Segment
// ============================================================================

export const StorySegmentSchema = z.object({
  id: z.string(), // "segment_1", "segment_2a", "segment_2b", etc.
  text: z.string(),
  audio_url: z.string().url(),
  checkpoint_number: z.number().int().min(0), // 0 = start, 1 = first checkpoint, etc.
  choice_text: z.string().optional(), // The choice text that leads to this segment (if applicable)
});

// ============================================================================
// Story Branch (for pre-generated paths)
// ============================================================================

export const StoryBranchSchema = z.object({
  choice_text: z.string(), // The text of the choice (e.g., "Share the toy")
  choice_value: BranchChoiceSchema, // "A" or "B"
  segment: StorySegmentSchema,
});

// ============================================================================
// API Request/Response Schemas
// ============================================================================

// POST /api/story/start - Request
export const StartRequestSchema = z.object({
  child: ChildSchema,
  story_length: StoryLengthSchema, // 1, 2, or 3 minutes
  interactive: z.boolean(),
  moral_focus: MoralFocusSchema,
  voice_selection: VoiceSelectionSchema.optional().default('custom'), // Voice narrator selection
});

// POST /api/story/start - Response
export const StartResponseSchema = z.object({
  session_id: z.string().uuid(),
  segment: StorySegmentSchema, // First segment (start → checkpoint 1)
  next_branches: z.array(StoryBranchSchema).length(2).optional(), // Pre-generated branches (only if interactive)
  story_complete: z.boolean(), // true if non-interactive single segment
});

// POST /api/story/continue - Request
export const ContinueRequestSchema = z.object({
  session_id: z.string().uuid(),
  checkpoint: z.number().int().min(1), // Which checkpoint the user just reached
  chosen_branch: BranchChoiceSchema, // "A" or "B"
});

// POST /api/story/continue - Response
export const ContinueResponseSchema = z.object({
  segment: StorySegmentSchema, // The segment for the chosen branch (already pre-generated)
  next_branches: z.array(StoryBranchSchema).length(2).optional(), // Next pre-generated branches (if not final)
  story_complete: z.boolean(), // true if this was the final segment
});

// POST /api/story/evaluate - Request
export const EvaluationRequestSchema = z.object({
  session_id: z.string().uuid(),
});

// POST /api/story/evaluate - Response
export const EvaluationResponseSchema = z.object({
  evaluation: z.object({
    summary: z.string().min(50).max(500), // One paragraph summary
  }),
});

// ============================================================================
// Session Storage Schema (KV)
// ============================================================================

export const SessionSchema = z.object({
  session_id: z.string().uuid(),
  child: ChildSchema,
  story_length: StoryLengthSchema,
  interactive: z.boolean(),
  moral_focus: MoralFocusSchema,

  // Story metadata
  story_prompt: z.string(), // The detailed prompt generated in phase 1
  total_checkpoints: z.number().int(), // Total number of checkpoints (story_length)
  current_checkpoint: z.number().int(), // Current checkpoint (0 = start)
  words_per_segment: z.number().int(), // Calculated word count per segment

  // Voice metadata
  voice_selection: VoiceSelectionSchema.optional(), // User's voice selection (custom or preset)
  narrator_voice_id: z.string().optional(), // Generated ElevenLabs voice ID for this story (optional for backward compatibility)
  voice_description: z.string().optional(), // Description of the narrator's voice (for debugging)

  // Branch tracking
  chosen_path: z.array(BranchChoiceSchema), // History of choices ["A", "B", "A"]

  // Pre-generated content
  segments: z.array(StorySegmentSchema), // All generated segments (including pre-generated branches)

  // Async generation tracking
  next_branches_ready: z.boolean().default(false), // Whether next branches are generated
  generation_in_progress: z.boolean().default(false), // Whether background generation is happening

  // Evaluation (generated after story completion)
  evaluation_summary: z.string().optional(), // One paragraph evaluation of child's choices

  // Metadata
  created_at: z.string().datetime(),
});

// ============================================================================
// Gemini Response Schemas (for strict JSON parsing)
// ============================================================================

// Phase 1: Prompt generation
export const GeminiPromptResponseSchema = z.object({
  story_prompt: z.string(), // Detailed prompt for story generation
  story_theme: z.string().optional(), // Optional theme extracted
  voice_description: z.string(), // Description of narrator's voice for voice generation
});

// Phase 2: Story segment generation (non-interactive)
export const GeminiNonInteractiveResponseSchema = z.object({
  story_text: z.string(),
});

// Phase 2: Story segment generation (interactive - first segment)
export const GeminiFirstSegmentResponseSchema = z.object({
  segment_text: z.string(),
  choice_prompt: z.string(), // Question for the user (e.g., "What should Maya do?")
  choice_a: z.object({
    text: z.string(), // Choice text (e.g., "Share the toy")
    next_segment: z.string(), // Story continuation if A is chosen
  }),
  choice_b: z.object({
    text: z.string(),
    next_segment: z.string(),
  }),
});

// Phase 2: Story segment generation (interactive - continuation)
export const GeminiContinuationResponseSchema = z.object({
  choice_prompt: z.string().optional(), // Only if not the final segment
  choice_a: z.object({
    text: z.string(),
    next_segment: z.string(),
  }).optional(),
  choice_b: z.object({
    text: z.string(),
    next_segment: z.string(),
  }).optional(),
});

// ============================================================================
// TypeScript Types (exported for use in code)
// ============================================================================

export type Gender = z.infer<typeof GenderSchema>;
export type AgeRange = z.infer<typeof AgeRangeSchema>;
export type StoryLength = z.infer<typeof StoryLengthSchema>;
export type MoralFocus = z.infer<typeof MoralFocusSchema>;
export type BranchChoice = z.infer<typeof BranchChoiceSchema>;
export type VoiceSelection = z.infer<typeof VoiceSelectionSchema>;
export type Child = z.infer<typeof ChildSchema>;
export type StorySegment = z.infer<typeof StorySegmentSchema>;
export type StoryBranch = z.infer<typeof StoryBranchSchema>;
export type StartRequest = z.infer<typeof StartRequestSchema>;
export type StartResponse = z.infer<typeof StartResponseSchema>;
export type ContinueRequest = z.infer<typeof ContinueRequestSchema>;
export type ContinueResponse = z.infer<typeof ContinueResponseSchema>;
export type Session = z.infer<typeof SessionSchema>;
export type GeminiPromptResponse = z.infer<typeof GeminiPromptResponseSchema>;
export type GeminiNonInteractiveResponse = z.infer<typeof GeminiNonInteractiveResponseSchema>;
export type GeminiFirstSegmentResponse = z.infer<typeof GeminiFirstSegmentResponseSchema>;
export type GeminiContinuationResponse = z.infer<typeof GeminiContinuationResponseSchema>;
export type EvaluationRequest = z.infer<typeof EvaluationRequestSchema>;
export type EvaluationResponse = z.infer<typeof EvaluationResponseSchema>;
