/**
 * SEL (Social-Emotional Learning) and Moral Framework
 * Maps story choices to developmental themes for evaluation
 */

import { z } from 'zod';
import type { MoralFocus } from './story';

// ============================================================================
// GROW - The Advocate Themes
// ============================================================================

export const GROWThemeSchema = z.enum(['belonging', 'empathy', 'positive_action']);

export type GROWTheme = z.infer<typeof GROWThemeSchema>;

// ============================================================================
// SEL Competencies (CASEL Framework)
// ============================================================================

export const SELCompetencySchema = z.enum([
  'self_awareness',
  'self_management',
  'social_awareness',
  'relationship_skills',
  'responsible_decision_making',
]);

export type SELCompetency = z.infer<typeof SELCompetencySchema>;

// ============================================================================
// Choice Quality Indicator
// ============================================================================

export const ChoiceQualitySchema = z.enum([
  'growth_oriented', // Pro-social, aligns with moral lesson
  'less_ideal', // Not harmful, but misses the growth opportunity
]);

export type ChoiceQuality = z.infer<typeof ChoiceQualitySchema>;

// ============================================================================
// Moral Focus to SEL/GROW Mapping
// ============================================================================

export interface MoralThemeMapping {
  sel_competencies: SELCompetency[];
  grow_themes: GROWTheme[];
  growth_keywords: string[]; // Keywords that indicate growth-oriented choices
  less_ideal_keywords: string[]; // Keywords that indicate less-ideal choices
}

/**
 * Maps each moral focus to its corresponding SEL competencies and GROW themes
 */
export const MORAL_THEME_MAP: Record<MoralFocus, MoralThemeMapping> = {
  kindness: {
    sel_competencies: ['social_awareness', 'relationship_skills', 'responsible_decision_making'],
    grow_themes: ['empathy', 'positive_action'],
    growth_keywords: [
      'help',
      'share',
      'include',
      'care',
      'comfort',
      'support',
      'friendly',
      'generous',
      'compassionate',
    ],
    less_ideal_keywords: [
      'ignore',
      'exclude',
      'keep to yourself',
      'walk away',
      'pretend not to see',
      'avoid',
    ],
  },
  honesty: {
    sel_competencies: ['self_awareness', 'responsible_decision_making', 'relationship_skills'],
    grow_themes: ['positive_action', 'belonging'],
    growth_keywords: [
      'tell the truth',
      'admit',
      'confess',
      'own up',
      'be truthful',
      'explain what happened',
      'take responsibility',
    ],
    less_ideal_keywords: [
      'hide',
      'fib',
      'make up a story',
      'blame someone else',
      'keep it secret',
      'pretend',
    ],
  },
  courage: {
    sel_competencies: ['self_management', 'responsible_decision_making', 'self_awareness'],
    grow_themes: ['positive_action', 'belonging'],
    growth_keywords: [
      'try',
      'face',
      'stand up',
      'speak up',
      'be brave',
      'take a chance',
      'persevere',
      'challenge yourself',
    ],
    less_ideal_keywords: [
      'give up',
      'stay quiet',
      'back down',
      'run away',
      'avoid',
      'let it go',
      'stay safe',
    ],
  },
  sharing: {
    sel_competencies: ['relationship_skills', 'social_awareness', 'responsible_decision_making'],
    grow_themes: ['empathy', 'belonging', 'positive_action'],
    growth_keywords: [
      'share',
      'take turns',
      'divide',
      'offer',
      'give',
      'let them have some',
      'play together',
    ],
    less_ideal_keywords: [
      'keep it all',
      'hide it',
      'play alone',
      'refuse to share',
      'take it back',
      'mine only',
    ],
  },
  perseverance: {
    sel_competencies: ['self_management', 'self_awareness', 'responsible_decision_making'],
    grow_themes: ['positive_action'],
    growth_keywords: [
      'keep trying',
      'practice',
      'try again',
      'dont give up',
      'work harder',
      'persist',
      'stick with it',
    ],
    less_ideal_keywords: [
      'quit',
      'give up',
      'its too hard',
      'stop trying',
      'ask someone else to do it',
      'walk away',
    ],
  },
};

// ============================================================================
// Choice Tracking Schema (extends existing choice data)
// ============================================================================

export const ChoiceRecordSchema = z.object({
  checkpoint_number: z.number().int().min(1),
  chosen_value: z.enum(['A', 'B']),
  chosen_text: z.string(),
  choice_quality: ChoiceQualitySchema,
  immediate_feedback: z.string().optional(), // Age-appropriate feedback shown after choice
});

export type ChoiceRecord = z.infer<typeof ChoiceRecordSchema>;

// ============================================================================
// Enhanced Evaluation Schema
// ============================================================================

export const EnhancedEvaluationSchema = z.object({
  summary: z.string().min(50).max(600), // Extended for richer feedback
  sel_competencies_demonstrated: z.array(SELCompetencySchema),
  grow_themes_demonstrated: z.array(GROWThemeSchema),
  growth_oriented_count: z.number().int().min(0),
  total_choices: z.number().int().min(1),
  key_moments: z.array(z.string()).max(3), // Up to 3 key moments to highlight
});

export type EnhancedEvaluation = z.infer<typeof EnhancedEvaluationSchema>;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get human-readable SEL competency name
 */
export function getSELCompetencyName(competency: SELCompetency): string {
  const names: Record<SELCompetency, string> = {
    self_awareness: 'Self-Awareness',
    self_management: 'Self-Management',
    social_awareness: 'Social Awareness',
    relationship_skills: 'Relationship Skills',
    responsible_decision_making: 'Responsible Decision-Making',
  };
  return names[competency];
}

/**
 * Get human-readable GROW theme name
 */
export function getGROWThemeName(theme: GROWTheme): string {
  const names: Record<GROWTheme, string> = {
    belonging: 'Belonging',
    empathy: 'Empathy',
    positive_action: 'Positive Action',
  };
  return names[theme];
}

/**
 * Get age-appropriate description for a SEL competency
 */
export function getSELCompetencyDescription(
  competency: SELCompetency,
  ageGroup: string
): string {
  const young = ageGroup === '4-6';

  const descriptions: Record<SELCompetency, { young: string; older: string }> = {
    self_awareness: {
      young: 'understanding your feelings',
      older: 'understanding your emotions and what makes you unique',
    },
    self_management: {
      young: 'staying calm and trying your best',
      older: 'managing your emotions and staying motivated',
    },
    social_awareness: {
      young: 'understanding how others feel',
      older: 'understanding others\' perspectives and showing empathy',
    },
    relationship_skills: {
      young: 'being a good friend',
      older: 'building positive relationships and working with others',
    },
    responsible_decision_making: {
      young: 'making good choices',
      older: 'making thoughtful, ethical choices',
    },
  };

  return young ? descriptions[competency].young : descriptions[competency].older;
}
