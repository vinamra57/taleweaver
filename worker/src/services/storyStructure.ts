/**
 * Story Structure Service
 * Calculates segment counts and word counts based on story length
 */

import type { StoryLength } from '../schemas/story';
import { createLogger } from '../utils/logger';

const logger = createLogger('Story Structure');

// Word count per minute of reading (approximate)
const WORDS_PER_MINUTE = 150;

export interface StoryStructure {
  total_words: number; // Total words for the entire story
  total_checkpoints: number; // Number of choice points (= story_length for interactive)
  total_segments: number; // Number of segments (checkpoints + 1)
  words_per_segment: number; // Words per segment (equal distribution)
}

/**
 * Calculate story structure based on length and interactive mode
 */
export function calculateStoryStructure(
  storyLength: StoryLength,
  interactive: boolean
): StoryStructure {
  const totalWords = storyLength * WORDS_PER_MINUTE;

  if (!interactive) {
    // Non-interactive: one continuous story
    return {
      total_words: totalWords,
      total_checkpoints: 0,
      total_segments: 1,
      words_per_segment: totalWords,
    };
  }

  // Interactive: story_length determines number of checkpoints
  // For 3-minute story: 3 checkpoints, 4 segments
  // Structure: Segment1 → Choice1 → Segment2 → Choice2 → Segment3 → Choice3 → Segment4
  const totalCheckpoints = storyLength;
  const totalSegments = totalCheckpoints + 1;
  const wordsPerSegment = Math.floor(totalWords / totalSegments);

  logger.info('Story structure calculated', {
    storyLength,
    interactive,
    totalWords,
    totalCheckpoints,
    totalSegments,
    wordsPerSegment,
  });

  return {
    total_words: totalWords,
    total_checkpoints: totalCheckpoints,
    total_segments: totalSegments,
    words_per_segment: wordsPerSegment,
  };
}

/**
 * Generate segment ID based on checkpoint and branch
 * Examples:
 * - segment_1 (first segment, no branch)
 * - segment_2a (second segment, branch A)
 * - segment_2b (second segment, branch B)
 * - segment_3a (third segment, branch A)
 */
export function generateSegmentId(
  checkpointNumber: number,
  branch?: 'A' | 'B'
): string {
  const segmentNumber = checkpointNumber + 1; // checkpoint 0 → segment 1
  if (!branch) {
    return `segment_${segmentNumber}`;
  }
  return `segment_${segmentNumber}${branch.toLowerCase()}`;
}

/**
 * Check if a checkpoint is the final one
 */
export function isFinalCheckpoint(
  currentCheckpoint: number,
  totalCheckpoints: number
): boolean {
  return currentCheckpoint === totalCheckpoints;
}

/**
 * Get complexity level based on age range
 * This is used to adjust vocabulary and sentence structure
 */
export function getComplexityLevel(ageRange: '4-6' | '7-9' | '10-12'): string {
  const complexityMap = {
    '4-6': 'very simple',
    '7-9': 'moderate',
    '10-12': 'more complex',
  };
  return complexityMap[ageRange];
}

/**
 * Get pronoun set based on gender
 */
export function getPronouns(gender: 'male' | 'female'): {
  subject: string;
  object: string;
  possessive: string;
  possessive_pronoun: string;
  reflexive: string;
} {
  if (gender === 'male') {
    return {
      subject: 'he',
      object: 'him',
      possessive: 'his',
      possessive_pronoun: 'his',
      reflexive: 'himself',
    };
  } else {
    return {
      subject: 'she',
      object: 'her',
      possessive: 'her',
      possessive_pronoun: 'hers',
      reflexive: 'herself',
    };
  }
}
