import type { DurableObjectNamespace } from '@cloudflare/workers-types';

/**
 * Cloudflare Worker Environment Bindings
 * This interface defines all environment variables, secrets, and bindings available to the worker
 */

// UserDO method signatures for proper typing
export interface UserDOStub {
  createUser(user: any): Promise<any>;
  getUserById(userId: string): Promise<any>;
  getUserByEmail(email: string): Promise<any>;
  updateUser(userId: string, updates: any): Promise<any>;
  createChildProfile(profile: any): Promise<any>;
  getChildProfile(profileId: string): Promise<any>;
  getUserChildProfiles(userId: string): Promise<any[]>;
  updateChildProfile(profileId: string, updates: any): Promise<any>;
  deleteChildProfile(profileId: string, userId: string): Promise<boolean>;
  saveStory(story: any): Promise<any>;
  getStory(storyId: string): Promise<any>;
  getUserStories(userId: string, limit?: number): Promise<any[]>;
  updateStory(storyId: string, updates: any): Promise<any>;
  deleteStory(storyId: string, userId: string): Promise<boolean>;
  saveSong(song: any): Promise<any>;
  getSong(songId: string): Promise<any>;
  getUserSongs(userId: string, limit?: number): Promise<any[]>;
  updateSong(songId: string, updates: any): Promise<any>;
  deleteSong(songId: string, userId: string): Promise<boolean>;
  createSession(session: any): Promise<any>;
  getSession(sessionId: string): Promise<any>;
  deleteSession(sessionId: string): Promise<boolean>;
}

export interface Env {
  // KV Namespace for session storage
  TALEWEAVER_SESSIONS: KVNamespace;

  // R2 Bucket for audio file storage
  AUDIO_BUCKET: R2Bucket;

  // Workers AI binding
  AI: Ai;

  // Durable Object Namespaces
  USER_DO: DurableObjectNamespace;

  // Secrets (set via wrangler secret put)
  GEMINI_API_KEY: string;
  ELEVENLABS_API_KEY: string;
  ELEVENLABS_VOICE_ID: string;
  JWT_SECRET: string; // Secret for JWT signing

  // Environment variables
  ELEVENLABS_MODEL_ID: string;
  SESSION_TTL_HOURS: string;
  R2_PUBLIC_URL?: string; // Optional: for public bucket URLs
  DISABLE_TTS?: string; // Optional: set to 'true' to disable TTS calls during testing
}
