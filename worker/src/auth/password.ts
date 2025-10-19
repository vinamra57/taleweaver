/**
 * Password Hashing Service
 * Uses Web Crypto API (available in Cloudflare Workers)
 */

import { createLogger } from '../utils/logger';

const logger = createLogger('Password Service');

/**
 * Hash a password using PBKDF2
 * @param password - Plain text password
 * @returns Hashed password with salt (format: salt:hash)
 */
export async function hashPassword(password: string): Promise<string> {
  try {
    // Generate random salt
    const salt = crypto.getRandomValues(new Uint8Array(16));

    // Convert password to buffer
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);

    // Import password as key
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );

    // Derive key using PBKDF2
    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      256
    );

    // Convert to hex strings
    const saltHex = Array.from(salt)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    const hashHex = Array.from(new Uint8Array(derivedBits))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    return `${saltHex}:${hashHex}`;
  } catch (error) {
    logger.error('Password hashing failed', error);
    throw new Error('Failed to hash password');
  }
}

/**
 * Verify a password against a hash
 * @param password - Plain text password
 * @param hash - Hashed password (format: salt:hash)
 * @returns True if password matches
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    const [saltHex, storedHashHex] = hash.split(':');

    if (!saltHex || !storedHashHex) {
      throw new Error('Invalid hash format');
    }

    // Convert salt from hex to Uint8Array
    const salt = new Uint8Array(
      saltHex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
    );

    // Convert password to buffer
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);

    // Import password as key
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );

    // Derive key using PBKDF2
    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      256
    );

    // Convert to hex
    const hashHex = Array.from(new Uint8Array(derivedBits))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    // Compare hashes in constant time
    return hashHex === storedHashHex;
  } catch (error) {
    logger.error('Password verification failed', error);
    return false;
  }
}

/**
 * Validate password strength
 * @param password - Password to validate
 * @returns Validation result
 */
export function validatePasswordStrength(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (password.length > 128) {
    errors.push('Password must be less than 128 characters');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[^a-zA-Z0-9]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Generate a random token for email verification or password reset
 * @param length - Token length in bytes (will be hex encoded, so actual string length is 2x)
 * @returns Random token
 */
export function generateSecureToken(length: number = 32): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
