/**
 * Gemini Service - Two-Phase Story Generation
 * Phase 1: Generate detailed story prompt
 * Phase 2: Generate story segments
 */

import type { Env } from '../types/env';
import {
  GeminiPromptResponse,
  GeminiPromptResponseSchema,
  GeminiNonInteractiveResponse,
  GeminiNonInteractiveResponseSchema,
  GeminiFirstSegmentResponse,
  GeminiFirstSegmentResponseSchema,
  GeminiContinuationResponse,
  GeminiContinuationResponseSchema,
} from '../schemas/story';
import { GeminiError } from '../utils/errors';
import { createLogger } from '../utils/logger';

const logger = createLogger('Gemini Service');

const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

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
            temperature: 0.8,
            maxOutputTokens: 2048,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new GeminiError(`API returned ${response.status}: ${errorText}`);
      }

      const data = (await response.json()) as any;

      // Extract text from Gemini response
      const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!generatedText) {
        throw new GeminiError('No text generated in response');
      }

      logger.debug('Gemini API call successful');
      return generatedText;
    } catch (error) {
      if (attempt < maxRetries) {
        logger.warn(`Gemini API call failed (attempt ${attempt + 1}), retrying...`, error);
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
    throw new GeminiError(`Failed to parse JSON from response: ${error}`);
  }
}

/**
 * Phase 1: Generate detailed story prompt from user inputs
 */
export async function generateStoryPrompt(
  prompt: string,
  env: Env
): Promise<GeminiPromptResponse> {
  try {
    logger.info('Phase 1: Generating detailed story prompt');

    const responseText = await callGeminiWithRetry(prompt, env.GEMINI_API_KEY, 1);

    // Parse and validate JSON
    const jsonData = extractJSON(responseText);
    const validatedData = GeminiPromptResponseSchema.parse(jsonData);

    logger.info('Story prompt generated successfully');
    return validatedData;
  } catch (error) {
    logger.error('Failed to generate story prompt', error);
    throw error instanceof GeminiError
      ? error
      : new GeminiError(`Story prompt generation failed: ${error}`);
  }
}

/**
 * Phase 2A: Generate non-interactive story (single continuous narrative)
 */
export async function generateNonInteractiveStory(
  prompt: string,
  env: Env
): Promise<GeminiNonInteractiveResponse> {
  try {
    logger.info('Phase 2: Generating non-interactive story');

    const responseText = await callGeminiWithRetry(prompt, env.GEMINI_API_KEY, 1);

    // Parse and validate JSON
    const jsonData = extractJSON(responseText);
    const validatedData = GeminiNonInteractiveResponseSchema.parse(jsonData);

    logger.info('Non-interactive story generated successfully');
    return validatedData;
  } catch (error) {
    logger.error('Failed to generate non-interactive story', error);
    throw error instanceof GeminiError
      ? error
      : new GeminiError(`Non-interactive story generation failed: ${error}`);
  }
}

/**
 * Phase 2B: Generate first segment with branching choices
 */
export async function generateFirstSegment(
  prompt: string,
  env: Env
): Promise<GeminiFirstSegmentResponse> {
  try {
    logger.info('Phase 2: Generating first segment with branches');

    const responseText = await callGeminiWithRetry(prompt, env.GEMINI_API_KEY, 1);

    // Parse and validate JSON
    const jsonData = extractJSON(responseText);
    const validatedData = GeminiFirstSegmentResponseSchema.parse(jsonData);

    logger.info('First segment with branches generated successfully');
    return validatedData;
  } catch (error) {
    logger.error('Failed to generate first segment', error);
    throw error instanceof GeminiError
      ? error
      : new GeminiError(`First segment generation failed: ${error}`);
  }
}

/**
 * Phase 2C: Generate continuation segments after a choice
 */
export async function generateContinuation(
  prompt: string,
  env: Env
): Promise<GeminiContinuationResponse> {
  try {
    logger.info('Phase 2: Generating continuation with new branches');

    const responseText = await callGeminiWithRetry(prompt, env.GEMINI_API_KEY, 1);

    // Parse and validate JSON
    const jsonData = extractJSON(responseText);
    const validatedData = GeminiContinuationResponseSchema.parse(jsonData);

    logger.info('Continuation generated successfully');
    return validatedData;
  } catch (error) {
    logger.error('Failed to generate continuation', error);
    throw error instanceof GeminiError
      ? error
      : new GeminiError(`Continuation generation failed: ${error}`);
  }
}
