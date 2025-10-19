import { z } from 'zod';

/**
 * User Authentication Schemas
 */

// ============================================================================
// Base User Schema
// ============================================================================

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email().toLowerCase(),
  password_hash: z.string(),
  name: z.string().min(1).max(100),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type User = z.infer<typeof UserSchema>;

// ============================================================================
// Child Profile Schema
// ============================================================================

export const ChildProfileSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  name: z
    .string()
    .min(1, 'Name is required')
    .max(50, 'Name too long')
    .regex(/^[a-zA-Z\s'-]+$/, 'Name must contain only letters, spaces, hyphens, and apostrophes'),
  gender: z.enum(['male', 'female']),
  age_range: z.enum(['4-6', '7-9', '10-12']),
  interests: z.string().min(1).max(500), // Stored as comma-separated string
  context: z.string().max(200).optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type ChildProfile = z.infer<typeof ChildProfileSchema>;

// ============================================================================
// Saved Story Schema
// ============================================================================

export const SavedStorySchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  session_id: z.string().uuid(), // Links to KV session
  title: z.string().min(1).max(200),
  child_name: z.string(),
  moral_focus: z.enum(['kindness', 'honesty', 'courage', 'sharing', 'perseverance']),
  interactive: z.boolean(),
  created_at: z.string().datetime(),
  last_played_at: z.string().datetime().optional(),
});

export type SavedStory = z.infer<typeof SavedStorySchema>;

// ============================================================================
// Saved Song Schema
// ============================================================================

export const SavedSongSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  session_id: z.string().uuid(), // Links to KV song session
  title: z.string().min(1).max(200),
  child_name: z.string(),
  moral_focus: z.enum(['kindness', 'honesty', 'courage', 'sharing', 'perseverance']),
  song_type: z.enum(['song', 'rhyme', 'instrumental']),
  musical_style: z.enum(['lullaby', 'pop', 'folk', 'classical', 'jazz']),
  duration_seconds: z.number().int(),
  created_at: z.string().datetime(),
  last_played_at: z.string().datetime().optional(),
});

export type SavedSong = z.infer<typeof SavedSongSchema>;

// ============================================================================
// Session Schema (for JWT sessions)
// ============================================================================

export const SessionSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  token_hash: z.string(), // Hashed JWT for revocation
  expires_at: z.string().datetime(),
  created_at: z.string().datetime(),
});

export type Session = z.infer<typeof SessionSchema>;

// ============================================================================
// API Request/Response Schemas
// ============================================================================

// Signup Request
export const SignupRequestSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  email: z.string().email('Invalid email address').toLowerCase(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirm_password: z.string(),
}).refine((data) => data.password === data.confirm_password, {
  message: "Passwords don't match",
  path: ['confirm_password'],
});

export type SignupRequest = z.infer<typeof SignupRequestSchema>;

// Login Request
export const LoginRequestSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string(),
});

export type LoginRequest = z.infer<typeof LoginRequestSchema>;

// Change Password Request
export const ChangePasswordRequestSchema = z.object({
  current_password: z.string(),
  new_password: z.string().min(8, 'Password must be at least 8 characters'),
  confirm_new_password: z.string(),
}).refine((data) => data.new_password === data.confirm_new_password, {
  message: "Passwords don't match",
  path: ['confirm_new_password'],
});

export type ChangePasswordRequest = z.infer<typeof ChangePasswordRequestSchema>;

// Auth Response
export const AuthResponseSchema = z.object({
  user: UserSchema.omit({ password_hash: true }),
  access_token: z.string(),
  refresh_token: z.string().optional(),
});

export type AuthResponse = z.infer<typeof AuthResponseSchema>;

// Child Profile Create Request
export const CreateChildProfileRequestSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(50, 'Name too long')
    .regex(/^[a-zA-Z\s'-]+$/, 'Name must contain only letters'),
  gender: z.enum(['male', 'female']),
  age_range: z.enum(['4-6', '7-9', '10-12']),
  interests: z.string().min(1).max(500),
  context: z.string().max(200).optional(),
});

export type CreateChildProfileRequest = z.infer<typeof CreateChildProfileRequestSchema>;

// Update Child Profile Request
export const UpdateChildProfileRequestSchema = CreateChildProfileRequestSchema.partial();

export type UpdateChildProfileRequest = z.infer<typeof UpdateChildProfileRequestSchema>;

// Save Story Request
export const SaveStoryRequestSchema = z.object({
  session_id: z.string().uuid(),
  title: z.string().min(1).max(200),
});

export type SaveStoryRequest = z.infer<typeof SaveStoryRequestSchema>;

// Save Song Request
export const SaveSongRequestSchema = z.object({
  session_id: z.string().uuid(),
  title: z.string().min(1).max(200),
});

export type SaveSongRequest = z.infer<typeof SaveSongRequestSchema>;
