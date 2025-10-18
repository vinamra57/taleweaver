/**
 * Workers AI Service - Reading Level Rewrite
 * Uses Cloudflare Workers AI to rewrite text for appropriate grade level
 */

import type { Env } from '../types/env';
import { WorkersAIError } from '../utils/errors';
import { createLogger } from '../utils/logger';
import { buildRewritePrompt } from '../prompts/rewrite';

const logger = createLogger('Workers AI Service');

// Use Llama 3 8B model for text generation
const MODEL = '@cf/meta/llama-3-8b-instruct';

/**
 * Rewrite scene text for appropriate grade level
 * Falls back to original text on timeout or error
 */
export async function rewriteForGradeLevel(
  sceneText: string,
  age: number,
  env: Env
): Promise<string> {
  try {
    logger.debug('Rewriting text for grade level', { age, textLength: sceneText.length });

    const prompt = buildRewritePrompt(sceneText, age);

    const response = await env.AI.run(MODEL, {
      prompt,
      max_tokens: 512,
      temperature: 0.7,
    });

    // Extract response text
    let rewrittenText: string;

    if (typeof response === 'string') {
      rewrittenText = response;
    } else if (response && typeof response === 'object' && 'response' in response) {
      rewrittenText = (response as { response: string }).response;
    } else {
      throw new WorkersAIError('Unexpected response format from Workers AI');
    }

    if (!rewrittenText || rewrittenText.trim().length === 0) {
      logger.warn('Empty rewrite response, using original text');
      return sceneText;
    }

    logger.info('Text rewritten successfully', {
      originalLength: sceneText.length,
      rewrittenLength: rewrittenText.length,
    });

    return rewrittenText.trim();
  } catch (error) {
    logger.warn('Workers AI rewrite failed, using original text', error);
    // Fallback to original text on any error
    return sceneText;
  }
}

/**
 * Safety check using Workers AI (alternative to rewrite)
 * Returns true if content is safe, false otherwise
 */
export async function checkContentSafety(
  text: string,
  env: Env
): Promise<boolean> {
  try {
    logger.debug('Checking content safety', { textLength: text.length });

    const prompt = `Is the following text appropriate for children aged 5-11?
Answer only with "yes" or "no".

TEXT:
"""
${text}
"""

ANSWER:`;

    const response = await env.AI.run(MODEL, {
      prompt,
      max_tokens: 10,
      temperature: 0.1,
    });

    let answerText: string;

    if (typeof response === 'string') {
      answerText = response;
    } else if (response && typeof response === 'object' && 'response' in response) {
      answerText = (response as { response: string }).response;
    } else {
      logger.warn('Unexpected safety check response format');
      return true; // Default to safe on error
    }

    const isSafe = answerText.toLowerCase().trim().startsWith('yes');

    logger.info('Content safety check complete', { isSafe });
    return isSafe;
  } catch (error) {
    logger.warn('Safety check failed, defaulting to safe', error);
    // Default to safe on error
    return true;
  }
}
