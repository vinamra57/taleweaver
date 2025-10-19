import { z } from "zod";

// ============================================================================
// Base Types
// ============================================================================

export type Gender = "male" | "female";
export type AgeGroup = "4-6" | "7-9" | "10-12";
export type DurationMin = 1 | 2 | 3;
export type EmotionHint = "warm" | "curious" | "tense" | "relieved";
export type ChoiceId = "A" | "B";
export type MoralFocus =
  | 'kindness'
  | 'honesty'
  | 'courage'
  | 'sharing'
  | 'perseverance';

// ============================================================================
// Child Profile
// ============================================================================

export interface Child {
  name: string;
  gender: Gender;
  age_group: AgeGroup;
  interests: string[];  // max 5
  context?: string;     // optional
}

// ============================================================================
// Story Segments
// ============================================================================

interface SegmentBase {
  text: string;
  emotion_hint: EmotionHint;
  audio_url: string;
}

export interface CheckpointSegment extends SegmentBase {
  checkpoint_index: number;
}

export interface TransitionSegment extends SegmentBase {
  from_checkpoint: number;
  to_checkpoint: number;
}

// ============================================================================
// Settings
// ============================================================================

export interface SettingsBase {
  duration_min: DurationMin;
  interactive: boolean;
  age_group: AgeGroup;
}

export interface InteractiveSettings extends SettingsBase {
  interactive: true;
}

export interface NonInteractiveSettings extends SettingsBase {
  interactive: false;
}

export type Settings = InteractiveSettings | NonInteractiveSettings;

// ============================================================================
// Choice Option (interactive mode)
// ============================================================================

export interface ChoiceOption {
  id: ChoiceId;
  label: string;
  segment: TransitionSegment;
}

// ============================================================================
// API Request Types
// ============================================================================

export interface StartRequest {
  child: Child;
  duration_min: DurationMin;
  interactive: boolean;
  moral_focus: MoralFocus;
}

export interface ContinueRequest {
  session_id: string;
  from_checkpoint: number;
  chosen: ChoiceId;
}

// ============================================================================
// API Response Types
// ============================================================================

// Interactive start response
export interface StartResponseInteractive {
  session_id: string;
  settings: InteractiveSettings;
  current_segment: CheckpointSegment;
  next_options: ChoiceOption[];
  remaining_checkpoints: number;
}

// Non-interactive start response
export interface StartResponseNonInteractive {
  session_id: string;
  settings: NonInteractiveSettings;
  segments: CheckpointSegment[];
}

export type StartResponse = StartResponseInteractive | StartResponseNonInteractive;

// Continue response - mid flow
export interface ContinueResponseMid {
  ack: {
    played_id: ChoiceId;
    played_segment: TransitionSegment;
  };
  next_options: ChoiceOption[];
  reached_final: false;
}

// Continue response - final
export interface ContinueResponseFinal {
  ack: {
    played_id: ChoiceId;
    played_segment: TransitionSegment;
  };
  reached_final: true;
  ending: {
    reflection: string;
  };
}

export type ContinueResponse = ContinueResponseMid | ContinueResponseFinal;

// ============================================================================
// Zod Schemas for Validation
// ============================================================================

export const ChildSchema = z.object({
  name: z.string().min(1, "Name is required"),
  gender: z.enum(["male", "female"]),
  age_group: z.enum(["4-6", "7-9", "10-12"]),
  interests: z.array(z.string()).min(1, "At least one interest is required").max(5, "Maximum 5 interests"),
  context: z.string().optional(),
});

const SegmentBaseSchema = z.object({
  text: z.string(),
  emotion_hint: z.enum(["warm", "curious", "tense", "relieved"]),
  audio_url: z.string().url(),
});

const CheckpointSegmentSchema = SegmentBaseSchema.extend({
  checkpoint_index: z.number(),
});

const TransitionSegmentSchema = SegmentBaseSchema.extend({
  from_checkpoint: z.number(),
  to_checkpoint: z.number(),
});

const ChoiceOptionSchema = z.object({
  id: z.enum(["A", "B"]),
  label: z.string(),
  segment: TransitionSegmentSchema,
});

const SettingsBaseSchema = z.object({
  duration_min: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  interactive: z.boolean(),
  age_group: z.enum(["4-6", "7-9", "10-12"]),
});

const InteractiveSettingsSchema = SettingsBaseSchema.extend({
  interactive: z.literal(true),
});

const NonInteractiveSettingsSchema = SettingsBaseSchema.extend({
  interactive: z.literal(false),
});

export const StartResponseInteractiveSchema = z.object({
  session_id: z.string(),
  settings: InteractiveSettingsSchema,
  current_segment: CheckpointSegmentSchema,
  next_options: z.array(ChoiceOptionSchema),
  remaining_checkpoints: z.number(),
});

export const StartResponseNonInteractiveSchema = z.object({
  session_id: z.string(),
  settings: NonInteractiveSettingsSchema,
  segments: z.array(CheckpointSegmentSchema),
});

const ContinueAckSchema = z.object({
  played_id: z.enum(["A", "B"]),
  played_segment: TransitionSegmentSchema,
});

export const ContinueResponseMidSchema = z.object({
  ack: ContinueAckSchema,
  next_options: z.array(ChoiceOptionSchema),
  reached_final: z.literal(false),
});

export const ContinueResponseFinalSchema = z.object({
  ack: ContinueAckSchema,
  reached_final: z.literal(true),
  ending: z.object({
    reflection: z.string(),
  }),
});

// ============================================================================
// Client-side session state
// ============================================================================

export interface NonInteractiveStoryState {
  segments: CheckpointSegment[];
}

export interface HistoryEntry {
  segment: CheckpointSegment;
  chosenOption?: string; // The text of the choice that led to this segment
}

export interface InteractiveStoryState {
  current_segment: CheckpointSegment;
  next_options: ChoiceOption[];
  remaining_checkpoints: number;
  history: HistoryEntry[];
}

export interface StoredStorySession {
  session_id: string;
  child: Child;
  settings: Settings;
  interactive_state?: InteractiveStoryState;
  non_interactive_state?: NonInteractiveStoryState;
  reached_final?: boolean;
  ending_reflection?: string;
}
