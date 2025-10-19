/**
 * Evaluation Service - Analyzes child's decision-making patterns
 * Uses Gemini to provide developmental feedback based on story choices
 * Enhanced with SEL competencies and GROW themes tracking
 */

import type { Env } from '../types/env';
import { GeminiError } from '../utils/errors';
import { createLogger } from '../utils/logger';
import { z } from 'zod';
import {
  MORAL_THEME_MAP,
  getSELCompetencyDescription,
  getGROWThemeName,
  type ChoiceQuality
} from '../schemas/selThemes';
import type { MoralFocus } from '../schemas/story';

const logger = createLogger('Evaluation Service');

const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent';

// Evaluation request interface - enhanced with choice quality tracking
export interface EvaluationRequest {
  child: {
    name: string;
    age_group: string;
    gender: string;
    interests: string[];
  };
  moral_focus: MoralFocus;
  story_history: Array<{
    segment_text: string;
    chosen_option?: string;
    choice_quality?: ChoiceQuality; // Track if choice was growth-oriented or less ideal
    checkpoint_index: number;
  }>;
  ending_reflection?: string;
}

// Enhanced evaluation response with decision analysis
export interface EvaluationResponse {
  summary: string; // Main evaluation paragraph
  growth_oriented_count?: number; // Number of growth-oriented choices
  total_choices?: number; // Total choices made
  key_moments?: string[]; // Up to 3 key decision moments
  sel_themes?: string[]; // SEL competencies demonstrated
  grow_themes?: string[]; // GROW themes demonstrated
}

// Zod schema for Gemini response validation - enhanced
const EvaluationResponseSchema = z.object({
  summary: z.string().min(50).max(600), // Extended for richer feedback
  growth_oriented_count: z.number().int().min(0).optional(),
  total_choices: z.number().int().min(1).optional(),
  key_moments: z.array(z.string()).max(3).optional(), // Up to 3 key moments
  sel_themes: z.array(z.string()).optional(),
  grow_themes: z.array(z.string()).optional(),
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
            responseMimeType: 'application/json',
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('Gemini API error response', {
          status: response.status,
          statusText: response.statusText,
          errorText: errorText.substring(0, 500),
        });
        throw new GeminiError(`API returned ${response.status}: ${errorText}`);
      }

      const data = (await response.json()) as any;

      // Log response structure for debugging
      logger.debug('Gemini response structure', {
        hasCandidates: !!data.candidates,
        candidatesLength: data.candidates?.length,
        firstCandidateHasContent: !!data.candidates?.[0]?.content,
        finishReason: data.candidates?.[0]?.finishReason,
      });

      // Extract text from Gemini response
      const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!generatedText) {
        logger.error('No text in Gemini response', {
          responseData: JSON.stringify(data).substring(0, 500),
        });
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
  try {
    // With responseMimeType: 'application/json', response should be pure JSON
    return JSON.parse(text.trim());
  } catch (error) {
    // Fallback: try to extract from markdown code blocks
    logger.warn('Direct JSON parse failed, trying markdown extraction');
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    const jsonText = jsonMatch ? jsonMatch[1] : text;

    try {
      return JSON.parse(jsonText.trim());
    } catch (fallbackError) {
      logger.error('Evaluation JSON parse failed', {
        rawText: text.substring(0, 500),
        extractedText: jsonText.substring(0, 500),
        hadCodeBlock: !!jsonMatch,
        error: String(fallbackError)
      });
      throw new GeminiError(`Failed to parse evaluation JSON: ${fallbackError}`);
    }
  }
}

/**
 * Build enhanced evaluation prompt for Gemini with decision analysis
 */
function buildEvaluationPrompt(request: EvaluationRequest): string {
  const { child, moral_focus, story_history } = request;
  const moralMapping = MORAL_THEME_MAP[moral_focus];

  // Build detailed choice analysis
  const choicesWithQuality = story_history
    .filter(entry => entry.chosen_option)
    .map((entry, index) => {
      const quality = entry.choice_quality || 'unknown';
      const qualityLabel = quality === 'growth_oriented' ? '[GROWTH-ORIENTED]' : '[LESS IDEAL]';
      return `Choice ${index + 1}: "${entry.chosen_option}" ${qualityLabel}
  Outcome: ${entry.segment_text.substring(0, 120)}...`;
    })
    .join('\n\n');

  // Count growth-oriented choices
  const growthOrientedCount = story_history.filter(
    entry => entry.choice_quality === 'growth_oriented'
  ).length;
  const totalChoices = story_history.filter(entry => entry.chosen_option).length;

  // Get SEL competencies for this moral focus
  const selCompetencies = moralMapping.sel_competencies
    .map(comp => getSELCompetencyDescription(comp, child.age_group))
    .join(', ');

  const growThemes = moralMapping.grow_themes
    .map(theme => getGROWThemeName(theme))
    .join(', ');

  return `You are a child development expert specializing in Social-Emotional Learning (SEL). Analyze this interactive story session and provide developmental feedback.

CHILD INFORMATION:
- Name: ${child.name}
- Age Group: ${child.age_group}
- Story Moral Focus: ${moral_focus}

DEVELOPMENTAL FRAMEWORK:
- SEL Competencies Targeted: ${selCompetencies}
- GROW Themes (The Advocate): ${growThemes}
- Growth-Oriented Choices Made: ${growthOrientedCount} out of ${totalChoices}

STORY CHOICES MADE:
${choicesWithQuality}

GROWTH KEYWORDS FOR ${moral_focus}:
- Positive indicators: ${moralMapping.growth_keywords.slice(0, 5).join(', ')}
- Learning opportunities: ${moralMapping.less_ideal_keywords.slice(0, 3).join(', ')}

Based on ${child.name}'s choices, create an evaluation that:

1. SUMMARY (4-5 sentences):
   - Celebrate what ${child.name} did well
   - Explain how their choices demonstrated ${moral_focus}
   - Mention specific moments that showed growth
   - If some choices were less ideal, frame as "learning opportunities" (never negative)
   - Make it warm, encouraging, and age-appropriate for ${child.age_group}

2. KEY MOMENTS (identify up to 3 specific decision points):
   - Highlight the most significant choices made
   - Explain what made each choice meaningful
   - Keep each moment brief (1 sentence)

3. THEMES DEMONSTRATED:
   - List which SEL competencies ${child.name} showed (from: ${moralMapping.sel_competencies.join(', ')})
   - List which GROW themes were demonstrated (from: ${moralMapping.grow_themes.join(', ')})

Return STRICT JSON only:
{
  "summary": "Your warm, encouraging 4-5 sentence paragraph here",
  "growth_oriented_count": ${growthOrientedCount},
  "total_choices": ${totalChoices},
  "key_moments": ["First key moment", "Second key moment", "Third key moment (optional)"],
  "sel_themes": ["competency1", "competency2"],
  "grow_themes": ["theme1", "theme2"]
}

TONE GUIDANCE:
- Focus on growth and learning, not perfection
- If ${growthOrientedCount} < ${totalChoices}, acknowledge that all choices helped ${child.name} learn
- Use age-appropriate vocabulary for ${child.age_group}
- Make it feel special for a parent to read aloud to their child
- Frame everything positively - this is about celebrating development`;
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