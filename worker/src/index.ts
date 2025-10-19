/**
 * TaleWeaver Worker - Main Entry Point
 * Cloudflare Worker API for interactive bedtime stories
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './types/env';
import { handleStoryStart } from './routes/storyStart';
import { handleStoryContinue } from './routes/storyContinue';
import { handleBranchStatus } from './routes/branchStatus';
import { handleGetBranches } from './routes/getBranches';
import { getAudio } from './services/r2';
import { TaleWeaverError } from './utils/errors';
import { createLogger } from './utils/logger';

// Auth routes
import { handleSignup } from './routes/auth/signup';
import { handleLogin } from './routes/auth/login';
import { handleChangePassword } from './routes/auth/changePassword';

// User routes
import { handleGetMe, handleUpdateMe } from './routes/user/profile';
import {
  handleListProfiles,
  handleCreateProfile,
  handleGetProfile,
  handleUpdateProfile,
  handleDeleteProfile,
} from './routes/user/childProfiles';
import {
  handleListStories,
  handleGetStory,
  handleSaveStory,
  handleDeleteStory,
} from './routes/user/stories';
import { handleStoryEvaluation } from './routes/storyEvaluate';

// Auth middleware
import { requireAuth, optionalAuth } from './auth/middleware';

const logger = createLogger('Main');

// Create Hono app
const app = new Hono<{ Bindings: Env }>();

// CORS middleware - allow all origins for hackathon (tighten for production)
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// Health check endpoint
app.get('/', (c) => {
  return c.json({
    service: 'TaleWeaver API',
    version: '2.0.0',
    status: 'running',
    endpoints: {
      // Auth
      signup: 'POST /api/auth/signup',
      login: 'POST /api/auth/login',
      changePassword: 'POST /api/auth/change-password',
      // User
      me: 'GET /api/user/me',
      updateMe: 'PATCH /api/user/me',
      // Profiles
      profiles: 'GET/POST /api/profiles',
      profile: 'GET/PATCH/DELETE /api/profiles/:id',
      // Stories
      stories: 'GET/POST /api/stories',
      story: 'GET/DELETE /api/stories/:id',
      // Story Generation
      start: 'POST /api/story/start',
      continue: 'POST /api/story/continue',
      evaluate: 'POST /api/story/evaluate',
      status: 'GET /api/story/status/:sessionId',
      branches: 'GET /api/story/branches/:sessionId/:checkpoint',
      audio: 'GET /audio/:sessionId/:sceneId',
    },
  });
});

// ============================================================================
// Auth Routes
// ============================================================================
app.post('/api/auth/signup', handleSignup);
app.post('/api/auth/login', handleLogin);
app.post('/api/auth/change-password', requireAuth, handleChangePassword);

// ============================================================================
// Story Generation Routes (Optional Auth)
// ============================================================================
// These routes work with or without authentication
// If authenticated, stories can be saved to user account
app.post('/api/story/start', optionalAuth, handleStoryStart);
app.post('/api/story/continue', optionalAuth, handleStoryContinue);
app.post('/api/story/evaluate', optionalAuth, handleStoryEvaluation);
app.get('/api/story/status/:sessionId', handleBranchStatus);
app.get('/api/story/branches/:sessionId/:checkpoint', handleGetBranches);

// ============================================================================
// User Routes (Protected)
// ============================================================================
app.get('/api/user/me', requireAuth, handleGetMe);
app.patch('/api/user/me', requireAuth, handleUpdateMe);

// ============================================================================
// Child Profile Routes (Protected)
// ============================================================================
app.get('/api/profiles', requireAuth, handleListProfiles);
app.post('/api/profiles', requireAuth, handleCreateProfile);
app.get('/api/profiles/:id', requireAuth, handleGetProfile);
app.patch('/api/profiles/:id', requireAuth, handleUpdateProfile);
app.delete('/api/profiles/:id', requireAuth, handleDeleteProfile);

// ============================================================================
// Story History Routes (Protected)
// ============================================================================
app.get('/api/stories', requireAuth, handleListStories);
app.get('/api/stories/:id', requireAuth, handleGetStory);
app.post('/api/stories/save', requireAuth, handleSaveStory);
app.delete('/api/stories/:id', requireAuth, handleDeleteStory);

// ============================================================================
// Audio Serving
// ============================================================================
app.get('/audio/:sessionId/:sceneId', async (c) => {
  try {
    const sessionId = c.req.param('sessionId');
    const sceneId = c.req.param('sceneId');
    const key = `${sessionId}/${sceneId}`;

    logger.debug(`Serving audio: ${key}`);

    const audioBuffer = await getAudio(key, c.env);

    if (!audioBuffer) {
      return c.json({ error: 'Audio not found' }, 404);
    }

    return new Response(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    logger.error('Audio serve failed', error);
    return c.json({ error: 'Failed to serve audio' }, 500);
  }
});

// ============================================================================
// Error Handlers
// ============================================================================

// Global error handler
app.onError((err, c) => {
  logger.error('Unhandled error', err);

  if (err instanceof TaleWeaverError) {
    return c.json(
      {
        error: err.name,
        message: err.message,
        code: err.code,
      },
      err.statusCode as any
    );
  }

  return c.json(
    {
      error: 'Internal Server Error',
      message: err.message || 'An unexpected error occurred',
    },
    500
  );
});

// 404 handler
app.notFound((c) => {
  return c.json(
    {
      error: 'Not Found',
      message: 'The requested endpoint does not exist',
    },
    404
  );
});

// Export Hono app as default export
export default app;

// Export Durable Objects
export { UserDO } from './durable-objects/UserDO';
