/**
 * TaleWeaver Worker - Main Entry Point
 * Cloudflare Worker API for interactive bedtime stories
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './types/env';
import { handleStoryStart } from './routes/storyStart';
import { handleStoryContinue } from './routes/storyContinue';
import { getAudio } from './services/r2';
import { TaleWeaverError } from './utils/errors';
import { createLogger } from './utils/logger';

const logger = createLogger('Main');

// Create Hono app
const app = new Hono<{ Bindings: Env }>();

// CORS middleware - allow all origins for hackathon (tighten for production)
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type'],
}));

// Health check endpoint
app.get('/', (c) => {
  return c.json({
    service: 'TaleWeaver API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      start: 'POST /api/story/start',
      continue: 'POST /api/story/continue',
      audio: 'GET /audio/:sessionId/:sceneId.mp3',
    },
  });
});

// API Routes
app.post('/api/story/start', handleStoryStart);
app.post('/api/story/continue', handleStoryContinue);

// Audio proxy endpoint (for serving R2 audio files)
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

export default app;
