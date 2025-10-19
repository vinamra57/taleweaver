/**
 * JWT Service
 * Uses Web Crypto API for JWT signing and verification
 */

import { createLogger } from '../utils/logger';

const logger = createLogger('JWT Service');

export interface JWTPayload {
  sub: string; // User ID
  email: string;
  iat: number; // Issued at
  exp: number; // Expiration
  type: 'access' | 'refresh';
}

/**
 * Generate a JWT secret key from environment variable
 */
async function getSecretKey(secret: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);

  return await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

/**
 * Base64 URL encode
 */
function base64UrlEncode(data: ArrayBuffer | Uint8Array): string {
  const uint8Array = data instanceof Uint8Array ? data : new Uint8Array(data);
  const base64 = btoa(String.fromCharCode(...uint8Array));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Base64 URL decode
 */
function base64UrlDecode(str: string): Uint8Array {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(base64 + padding);
  return new Uint8Array(Array.from(binary, (c) => c.charCodeAt(0)));
}

/**
 * Create a JWT token
 * @param payload - JWT payload
 * @param secret - Secret key for signing
 * @param expiresIn - Expiration time in seconds
 * @returns JWT token
 */
export async function createToken(
  userId: string,
  email: string,
  secret: string,
  type: 'access' | 'refresh' = 'access',
  expiresIn: number = 3600 // 1 hour default
): Promise<string> {
  try {
    const now = Math.floor(Date.now() / 1000);

    const payload: JWTPayload = {
      sub: userId,
      email,
      iat: now,
      exp: now + expiresIn,
      type,
    };

    // Create header
    const header = {
      alg: 'HS256',
      typ: 'JWT',
    };

    // Encode header and payload
    const encoder = new TextEncoder();
    const headerEncoded = base64UrlEncode(encoder.encode(JSON.stringify(header)));
    const payloadEncoded = base64UrlEncode(encoder.encode(JSON.stringify(payload)));

    // Create signature
    const data = `${headerEncoded}.${payloadEncoded}`;
    const key = await getSecretKey(secret);
    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
    const signatureEncoded = base64UrlEncode(signature);

    return `${data}.${signatureEncoded}`;
  } catch (error) {
    logger.error('Token creation failed', error);
    throw new Error('Failed to create token');
  }
}

/**
 * Verify and decode a JWT token
 * @param token - JWT token
 * @param secret - Secret key for verification
 * @returns Decoded payload or null if invalid
 */
export async function verifyToken(
  token: string,
  secret: string
): Promise<JWTPayload | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const [headerEncoded, payloadEncoded, signatureEncoded] = parts;

    // Verify signature
    const encoder = new TextEncoder();
    const data = `${headerEncoded}.${payloadEncoded}`;
    const key = await getSecretKey(secret);
    const signature = base64UrlDecode(signatureEncoded);

    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      signature as any, // Uint8Array is valid but TypeScript types are incorrect
      encoder.encode(data)
    );

    if (!valid) {
      return null;
    }

    // Decode payload
    const payloadData = base64UrlDecode(payloadEncoded);
    const payloadString = new TextDecoder().decode(payloadData);
    const payload = JSON.parse(payloadString) as JWTPayload;

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      return null;
    }

    return payload;
  } catch (error) {
    logger.error('Token verification failed', error);
    return null;
  }
}

/**
 * Generate access and refresh tokens
 * @param userId - User ID
 * @param email - User email
 * @param secret - Secret key
 * @returns Object with access and refresh tokens
 */
export async function generateTokenPair(
  userId: string,
  email: string,
  secret: string
): Promise<{ accessToken: string; refreshToken: string }> {
  const accessToken = await createToken(userId, email, secret, 'access', 3600); // 1 hour
  const refreshToken = await createToken(userId, email, secret, 'refresh', 604800); // 7 days

  return {
    accessToken,
    refreshToken,
  };
}

/**
 * Hash a token for storage (to detect token revocation)
 */
export async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
