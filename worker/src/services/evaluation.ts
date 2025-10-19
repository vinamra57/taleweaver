/**
 * Evaluation Service - Analyzes child's decision-making patterns
 * Uses Gemini to provide developmental feedback based on story choices
 */

import type { Env } from '../types/env';
import { GeminiError } from '../utils/errors';
import { createLogger } from '../utils/logger';
import { z } from 'zod';

const logger = createLogger('Evaluation Service');

const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

// Evaluation request interface
export interface EvaluationRequest {
  child: {
    name: string;
    age_group: string;
    gender: string;
    interests: string[];
  };
  moral_focus: string;
  story_history: Array<{
    segment_text: string;
    chosen_option?: string;
    checkpoint_index: number;
  }>;
  ending_reflection?: string;
}

// Evaluation response interface - simplified to one paragraph
export interface EvaluationResponse {
  summary: string; // One paragraph summary of the child's choices and development
}

// Zod schema for Gemini response validation
const EvaluationResponseSchema = z.object({
  summary: z.string().min(50).max(500), // One paragraph, 50-500 characters
});

/**
 * Call Gemini API for evaluation
 */
async function callGeminiForEvaluation(
  prompt: string,
  apiKey: string,
  maxRetries = 1
): Promise<string> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      logger.debug(`Calling Gemini API for evaluation (attempt ${attempt + 1}/${maxRetries + 1})`);

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

      logger.debug('Gemini evaluation API call successful');
      return generatedText;
    } catch (error) {
      if (attempt < maxRetries) {
        logger.warn(`Gemini evaluation API call failed (attempt ${attempt + 1}), retrying...`, error);
      } else {
        logger.error('Gemini evaluation API call failed after retries', error);
        throw error instanceof GeminiError
          ? error
          : new GeminiError(`Evaluation failed after ${maxRetries + 1} attempts: ${error}`);
      }
    }
  }

  throw new GeminiError('Unexpected error in evaluation retry loop');
}

/**
 * Parse JSON from Gemini response
 */
function extractEvaluationJSON(text: string): unknown {
  // Remove markdown code blocks if present
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const jsonText = jsonMatch ? jsonMatch[1] : text;

  try {
    return JSON.parse(jsonText.trim());
  } catch (error) {
    logger.error('Evaluation JSON parse failed', {
      rawText: text.substring(0, 200),
      extractedText: jsonText.substring(0, 200),
      hadCodeBlock: !!jsonMatch,
      error: String(error)
    });
    throw new GeminiError(`Failed to parse evaluation JSON: ${error}`);
  }
}

/**
 * Build evaluation prompt for Gemini
 */
function buildEvaluationPrompt(request: EvaluationRequest): string {
  const { child, moral_focus, story_history } = request;

  const choicesText = story_history
    .filter(entry => entry.chosen_option)
    .map((entry, index) =>
      `Choice ${index + 1}: "${entry.chosen_option}" (led to: ${entry.segment_text.substring(0, 100)}...)`
    )
    .join('\n');

  return `You are a child development expert. Analyze the following interactive story session and provide a brief, positive evaluation.

CHILD INFORMATION:
- Name: ${child.name}
- Age Group: ${child.age_group}
- Story Moral Focus: ${moral_focus}

STORY CHOICES MADE:
${choicesText}

Based on ${child.name}'s choices in this story about ${moral_focus}, write ONE SHORT PARAGRAPH (3-4 sentences) that:
1. Highlights the positive qualities shown through their choices
2. Relates to the moral focus (${moral_focus})
3. Is encouraging and age-appropriate for ${child.age_group} year olds
4. Is warm and celebratory in tone

Return JSON format:
{
  "summary": "Your 3-4 sentence encouraging paragraph here"
}

Keep it simple, positive, and focused on what ${child.name} did well. Make it feel special for a parent to read to their child.`;
}

/**
 * Generate evaluation for a completed story
 */
export async function generateStoryEvaluation(
  request: EvaluationRequest,
  env: Env
): Promise<EvaluationResponse> {
  try {
    logger.info('Generating story evaluation', {
      childName: request.child.name,
      ageGroup: request.child.age_group,
      choicesCount: request.story_history.filter(h => h.chosen_option).length,
    });

    const prompt = buildEvaluationPrompt(request);
    const responseText = await callGeminiForEvaluation(prompt, env.GEMINI_API_KEY, 1);

    // Parse and validate JSON
    const jsonData = extractEvaluationJSON(responseText);
    const validatedData = EvaluationResponseSchema.parse(jsonData);

    logger.info('Story evaluation generated successfully');
    return validatedData;
  } catch (error) {
    logger.error('Failed to generate story evaluation', error);
    throw error instanceof GeminiError
      ? error
      : new GeminiError(`Story evaluation generation failed: ${error}`);
  }
}