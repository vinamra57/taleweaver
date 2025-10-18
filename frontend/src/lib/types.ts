import { z } from 'zod';

// Child profile
export interface Child {
  name: string;
  age: number;
  interests: string[];
  context?: string;
  moralFocus?: string;
}

// Moral meter
export interface MoralMeter {
  focus: string;
  score: number;
  explanation: string;
}

// Choice in a scene
export interface Choice {
  text: string;
  consequence_hint: string;
}

// Scene in the story
export interface Scene {
  scene_number: number;
  narrative: string;
  choices: Choice[];
  image_prompt?: string;
  audio_prompt?: string;
  moral_meter?: MoralMeter;
}

// API Request/Response types
export interface StartRequest {
  child: Child;
}

export interface StartResponse {
  session_id: string;
  story_title: string;
  initial_scene: Scene;
}

export interface ContinueRequest {
  session_id: string;
  chosen_option: number;
}

export interface ContinueResponse {
  next_scene: Scene;
  story_complete: boolean;
}

// Zod schemas for validation
export const ChildSchema = z.object({
  name: z.string().min(1, "Name is required"),
  age: z.number().min(3).max(12),
  interests: z.array(z.string()).min(1, "At least one interest is required"),
  context: z.string().optional(),
  moralFocus: z.string().optional(),
});

export const ChoiceSchema = z.object({
  text: z.string(),
  consequence_hint: z.string(),
});

export const MoralMeterSchema = z.object({
  focus: z.string(),
  score: z.number().min(0).max(100),
  explanation: z.string(),
});

export const SceneSchema = z.object({
  scene_number: z.number(),
  narrative: z.string(),
  choices: z.array(ChoiceSchema),
  image_prompt: z.string().optional(),
  audio_prompt: z.string().optional(),
  moral_meter: MoralMeterSchema.optional(),
});

export const StartResponseSchema = z.object({
  session_id: z.string(),
  story_title: z.string(),
  initial_scene: SceneSchema,
});

export const ContinueResponseSchema = z.object({
  next_scene: SceneSchema,
  story_complete: z.boolean(),
});

// Type exports from Zod schemas
export type ValidatedChild = z.infer<typeof ChildSchema>;
export type ValidatedStartResponse = z.infer<typeof StartResponseSchema>;
export type ValidatedContinueResponse = z.infer<typeof ContinueResponseSchema>;
