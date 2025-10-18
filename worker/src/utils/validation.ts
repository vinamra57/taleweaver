/**
 * Input Validation and Sanitization Utilities
 */

import { ValidationError } from './errors';

/**
 * Sanitize child name - allow only letters, spaces, hyphens, apostrophes
 */
export function sanitizeName(name: string): string {
  return name.trim().replace(/[^a-zA-Z\s'-]/g, '');
}

/**
 * Sanitize interests - trim and limit length
 */
export function sanitizeInterests(interests: string[]): string[] {
  return interests
    .map((interest) => interest.trim())
    .filter((interest) => interest.length > 0)
    .slice(0, 5) // Max 5 interests
    .map((interest) => interest.slice(0, 50)); // Max 50 chars each
}

/**
 * Sanitize context - trim and limit length
 */
export function sanitizeContext(context?: string): string | undefined {
  if (!context) return undefined;
  const trimmed = context.trim();
  return trimmed.length > 0 ? trimmed.slice(0, 120) : undefined;
}

/**
 * Validate age is within acceptable range
 */
export function validateAge(age: number): void {
  if (!Number.isInteger(age)) {
    throw new ValidationError('Age must be a whole number');
  }
  if (age < 5 || age > 11) {
    throw new ValidationError('Age must be between 5 and 11');
  }
}

/**
 * Generate a UUID v4
 */
export function generateUUID(): string {
  return crypto.randomUUID();
}

/**
 * Validate UUID format
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}
