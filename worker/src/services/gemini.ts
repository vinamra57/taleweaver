/**
 * Gemini Service - Story Generation
 * Handles calling Gemini API with strict JSON parsing and retry logic
 */

import type { Env } from '../types/env';
import {
  GeminiStartResponse,
  GeminiContinueResponse,
  GeminiStartResponseSchema,
  GeminiContinueResponseSchema,
} from '../schemas/story';
import { GeminiError } from '../utils/errors';
import { createLogger } from '../utils/logger';

const logger = createLogger('Gemini Service');

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

/**
 * Call Gemini API with retry logic for strict JSON
 */
async function callGeminiWithRetry(
  prompt: string,
  apiKey: string,
  maxRetries = 1
): Promise<string> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      logger.debug(`Calling Gemini API (attempt ${attempt + 1}/${maxRetries + 1})`);

      const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 800,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new GeminiError(
          `API returned ${response.status}: ${errorText}`
        );
      }

      const data = (await response.json()) as any;

      // Extract text from Gemini response
      const generatedText =
        data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!generatedText) {
        throw new GeminiError('No text generated in response');
      }

      logger.debug('Gemini API call successful');
      return generatedText;
    } catch (error) {
      if (attempt < maxRetries) {
        logger.warn(
          `Gemini API call failed (attempt ${attempt + 1}), retrying...`,
          error
        );
        // If this was a retry, add a hint to the prompt
        if (attempt === 0 && !prompt.includes('Return valid strict JSON')) {
          prompt += '\n\nReturn valid strict JSON only.';
        }
      } else {
        logger.error('Gemini API call failed after retries', error);
        throw error instanceof GeminiError
          ? error
          : new GeminiError(`Failed after ${maxRetries + 1} attempts: ${error}`);
      }
    }
  }

  throw new GeminiError('Unexpected error in retry loop');
}

/**
 * Parse JSON from Gemini response, handling markdown code blocks
 */
function extractJSON(text: string): unknown {
  // Remove markdown code blocks if present
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const jsonText = jsonMatch ? jsonMatch[1] : text;

  try {
    return JSON.parse(jsonText.trim());
  } catch (error) {
    throw new GeminiError(
      `Failed to parse JSON from response: ${error}`
    );
  }
}

/**
 * Generate start scene with Gemini
 */
export async function generateStartScene(
  prompt: string,
  env: Env
): Promise<GeminiStartResponse> {
  try {
    logger.info('Generating start scene with Gemini');

    const responseText = await callGeminiWithRetry(
      prompt,
      env.GEMINI_API_KEY,
      1
    );

    // Parse and validate JSON
    const jsonData = extractJSON(responseText);
    const validatedData = GeminiStartResponseSchema.parse(jsonData);

    logger.info('Start scene generated successfully');
    return validatedData;
  } catch (error) {
    logger.error('Failed to generate start scene', error);
    throw error instanceof GeminiError
      ? error
      : new GeminiError(`Start scene generation failed: ${error}`);
  }
}

/**
 * Generate continue scene with Gemini
 */
export async function generateContinueScene(
  prompt: string,
  env: Env
): Promise<GeminiContinueResponse> {
  try {
    logger.info('Generating continue scene with Gemini');

    const responseText = await callGeminiWithRetry(
      prompt,
      env.GEMINI_API_KEY,
      1
    );

    // Parse and validate JSON
    const jsonData = extractJSON(responseText);
    const validatedData = GeminiContinueResponseSchema.parse(jsonData);

    logger.info('Continue scene generated successfully');
    return validatedData;
  } catch (error) {
    logger.error('Failed to generate continue scene', error);
    throw error instanceof GeminiError
      ? error
      : new GeminiError(`Continue scene generation failed: ${error}`);
  }
}
