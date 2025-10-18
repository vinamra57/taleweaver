/**
 * Moral Meter Service - Rule-Based Scoring
 * Calculates moral scores based on keywords and story content
 */

import type { Scene, Choice, MoralFocus, MoralMeter } from '../schemas/story';
import { createLogger } from '../utils/logger';

const logger = createLogger('Moral Meter Service');

// Keyword mappings for each moral trait
const KINDNESS_KEYWORDS = [
  'share',
  'help',
  'include',
  'invite',
  'support',
  'care',
  'kind',
  'friend',
  'together',
  'welcome',
  'comfort',
  'gentle',
  'generous',
  'thoughtful',
];

const HONESTY_KEYWORDS = [
  'tell',
  'truth',
  'admit',
  'confess',
  'honest',
  'own up',
  'explain',
  'reveal',
  'true',
  'sincere',
  'open',
  'trustworthy',
];

const COURAGE_KEYWORDS = [
  'try',
  'brave',
  'courage',
  'new',
  'speak up',
  'stand up',
  'face',
  'fear',
  'bold',
  'confident',
  'challenge',
  'overcome',
  'risk',
];

/**
 * Calculate moral meter based on story content
 */
export function calculateMoralMeter(
  scenes: Scene[],
  _choices: Choice[],
  moralFocus: MoralFocus
): MoralMeter {
  try {
    logger.debug('Calculating moral meter', { moralFocus, sceneCount: scenes.length });

    // Combine all text from scenes
    const fullText = scenes.map((s) => s.text).join(' ').toLowerCase();

    // Calculate base scores
    const kindScore = calculateScore(fullText, KINDNESS_KEYWORDS);
    const honestScore = calculateScore(fullText, HONESTY_KEYWORDS);
    const braveScore = calculateScore(fullText, COURAGE_KEYWORDS);

    // Boost the focused moral
    const boostFactor = 1.2;
    let finalKind = kindScore;
    let finalHonest = honestScore;
    let finalBrave = braveScore;

    switch (moralFocus) {
      case 'kindness':
      case 'sharing':
        finalKind = Math.min(1.0, kindScore * boostFactor);
        break;
      case 'honesty':
        finalHonest = Math.min(1.0, honestScore * boostFactor);
        break;
      case 'courage':
      case 'perseverance':
        finalBrave = Math.min(1.0, braveScore * boostFactor);
        break;
    }

    // Ensure all values are in [0, 1] range
    const meter: MoralMeter = {
      kind: clamp(finalKind, 0, 1),
      honest: clamp(finalHonest, 0, 1),
      brave: clamp(finalBrave, 0, 1),
    };

    logger.info('Moral meter calculated', meter);
    return meter;
  } catch (error) {
    logger.error('Failed to calculate moral meter', error);
    // Return default values
    return {
      kind: 0.5,
      honest: 0.5,
      brave: 0.5,
    };
  }
}

/**
 * Calculate score based on keyword matches
 */
function calculateScore(text: string, keywords: string[]): number {
  let matches = 0;
  const totalKeywords = keywords.length;

  for (const keyword of keywords) {
    if (text.includes(keyword.toLowerCase())) {
      matches++;
    }
  }

  // Normalize to [0, 1] range
  // Use logarithmic scaling to avoid overweighting
  const rawScore = matches / (totalKeywords * 0.3); // 30% keywords = score of 1.0
  return Math.min(1.0, rawScore);
}

/**
 * Clamp value between min and max
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Get default moral meter (for initialization)
 */
export function getDefaultMoralMeter(): MoralMeter {
  return {
    kind: 0.5,
    honest: 0.5,
    brave: 0.5,
  };
}
