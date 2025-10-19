/**
 * Authentication Middleware
 * Protects routes and extracts user information from JWT
 */

import { Context, Next } from 'hono';
import type { Env } from '../types/env';
import { verifyToken, JWTPayload } from './jwt';
import { createLogger } from '../utils/logger';

const logger = createLogger('Auth Middleware');

/**
 * Extended context with user information
 */
export interface AuthContext {
  user: {
    id: string;
    email: string;
  };
  jwtPayload: JWTPayload;
}

/**
 * Middleware to require authentication
 * Expects Bearer token in Authorization header
 */
export async function requireAuth(
  c: Context<{ Bindings: Env }>,
  next: Next
): Promise<Response | void> {
  try {
    const authHeader = c.req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json(
        {
          error: 'Unauthorized',
          message: 'Missing or invalid authorization header',
        },
        401
      );
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const payload = await verifyToken(token, c.env.JWT_SECRET);

    if (!payload) {
      return c.json(
        {
          error: 'Unauthorized',
          message: 'Invalid or expired token',
        },
        401
      );
    }

    // Attach user info to context
    c.set('user', {
      id: payload.sub,
      email: payload.email,
    });
    c.set('jwtPayload', payload);

    await next();
  } catch (error) {
    logger.error('Auth middleware error', error);
    return c.json(
      {
        error: 'Unauthorized',
        message: 'Authentication failed',
      },
      401
    );
  }
}

/**
 * Optional auth middleware - attaches user if token present but doesn't require it
 */
export async function optionalAuth(
  c: Context<{ Bindings: Env }>,
  next: Next
): Promise<void> {
  try {
    const authHeader = c.req.header('Authorization');

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const payload = await verifyToken(token, c.env.JWT_SECRET);

      if (payload) {
        c.set('user', {
          id: payload.sub,
          email: payload.email,
        });
        c.set('jwtPayload', payload);
      }
    }

    await next();
  } catch (error) {
    logger.warn('Optional auth failed, continuing without auth', error);
    await next();
  }
}

/**
 * Get authenticated user from context
 */
export function getAuthUser(c: Context): AuthContext['user'] | null {
  return c.get('user') || null;
}

/**
 * Get authenticated user or throw error
 */
export function requireAuthUser(c: Context): AuthContext['user'] {
  const user = c.get('user');
  if (!user) {
    throw new Error('User not authenticated');
  }
  return user;
}
