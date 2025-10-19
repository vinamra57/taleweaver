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
 * Age-appropriate language guidelines for story generation
 */
export interface AgeAppropriateGuidelines {
  complexity: string;
  vocabulary_level: string;
  sentence_length: string;
  reading_level: string;
  max_syllables_per_word: number;
  example_vocabulary: string[];
  avoid_vocabulary: string[];
}

/**
 * Get comprehensive age-appropriate language guidelines
 */
export function getAgeAppropriateGuidelines(ageRange: '4-6' | '7-9' | '10-12'): AgeAppropriateGuidelines {
  const guidelines: Record<string, AgeAppropriateGuidelines> = {
    '4-6': {
      complexity: 'very simple',
      vocabulary_level: 'Basic sight words and common nouns (dog, cat, toy, friend, happy, sad)',
      sentence_length: 'Very short sentences (5-10 words). Use simple subject-verb-object structure.',
      reading_level: 'Pre-K to 1st grade (Lexile 0-200L)',
      max_syllables_per_word: 2,
      example_vocabulary: [
        'happy', 'sad', 'fun', 'play', 'friend', 'share', 'help', 'kind',
        'try', 'good', 'nice', 'toy', 'game', 'smile', 'hug', 'run', 'jump'
      ],
      avoid_vocabulary: [
        'anxious', 'frustrating', 'disappointed', 'complex', 'difficult',
        'challenging', 'situation', 'consequences', 'relationship'
      ],
    },
    '7-9': {
      complexity: 'moderate',
      vocabulary_level: 'Elementary vocabulary with some descriptive words (brave, worried, excited, problem)',
      sentence_length: 'Moderate sentences (10-15 words). Can use compound sentences with "and" or "but".',
      reading_level: '2nd to 3rd grade (Lexile 300-600L)',
      max_syllables_per_word: 3,
      example_vocabulary: [
        'brave', 'worried', 'excited', 'problem', 'decision', 'together',
        'honest', 'courage', 'mistake', 'apologize', 'practice', 'improve'
      ],
      avoid_vocabulary: [
        'contemplated', 'sophisticated', 'consequences', 'responsibility',
        'overwhelming', 'circumstance', 'perspective', 'theoretical'
      ],
    },
    '10-12': {
      complexity: 'more complex',
      vocabulary_level: 'Advanced elementary vocabulary with nuanced emotional and social terms',
      sentence_length: 'Complex sentences (15-20 words). Can use subordinate clauses and varied structure.',
      reading_level: '4th to 6th grade (Lexile 600-900L)',
      max_syllables_per_word: 4,
      example_vocabulary: [
        'determined', 'anxious', 'disappointed', 'encouraging', 'responsible',
        'consequences', 'persevere', 'compassionate', 'understanding', 'challenge'
      ],
      avoid_vocabulary: [
        'unprecedented', 'philosophical', 'theoretical', 'comprehensive',
        'methodological', 'introspective', 'existential'
      ],
    },
  };

  return guidelines[ageRange];
}

/**
 * Get complexity level based on age range (legacy function for backward compatibility)
 * This is used to adjust vocabulary and sentence structure
 */
export function getComplexityLevel(ageRange: '4-6' | '7-9' | '10-12'): string {
  return getAgeAppropriateGuidelines(ageRange).complexity;
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
