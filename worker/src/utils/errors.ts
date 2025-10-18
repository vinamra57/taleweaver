/**
 * Custom Error Classes for TaleWeaver
 */

export class TaleWeaverError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.name = 'TaleWeaverError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

export class ValidationError extends TaleWeaverError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class SessionNotFoundError extends TaleWeaverError {
  constructor(sessionId: string) {
    super(`Session ${sessionId} not found or expired`, 410, 'SESSION_EXPIRED');
    this.name = 'SessionNotFoundError';
  }
}

export class ExternalAPIError extends TaleWeaverError {
  public readonly service: string;

  constructor(service: string, message: string, statusCode = 502) {
    super(`${service} API error: ${message}`, statusCode, 'EXTERNAL_API_ERROR');
    this.name = 'ExternalAPIError';
    this.service = service;
  }
}

export class GeminiError extends ExternalAPIError {
  constructor(message: string) {
    super('Gemini', message);
    this.name = 'GeminiError';
  }
}

export class ElevenLabsError extends ExternalAPIError {
  constructor(message: string) {
    super('ElevenLabs', message);
    this.name = 'ElevenLabsError';
  }
}

export class WorkersAIError extends ExternalAPIError {
  constructor(message: string) {
    super('Workers AI', message);
    this.name = 'WorkersAIError';
  }
}

export class StorageError extends TaleWeaverError {
  constructor(message: string, operation: 'KV' | 'R2') {
    super(`${operation} storage error: ${message}`, 500, 'STORAGE_ERROR');
    this.name = 'StorageError';
  }
}
