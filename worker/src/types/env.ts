/**
 * Cloudflare Worker Environment Bindings
 * This interface defines all environment variables, secrets, and bindings available to the worker
 */
export interface Env {
  // KV Namespace for session storage
  TALEWEAVER_SESSIONS: KVNamespace;

  // R2 Bucket for audio file storage
  AUDIO_BUCKET: R2Bucket;

  // Workers AI binding
  AI: Ai;

  // Secrets (set via wrangler secret put)
  GEMINI_API_KEY: string;
  ELEVENLABS_API_KEY: string;
  ELEVENLABS_VOICE_ID: string;

  // Environment variables
  ELEVENLABS_MODEL_ID: string;
  SESSION_TTL_HOURS: string;
  R2_PUBLIC_URL?: string; // Optional: for public bucket URLs
}
