import { Child } from './types';

// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// Character Presets
export const CHARACTER_PRESETS: Record<string, Child> = {
  arjun: {
    name: 'Arjun',
    age: 8,
    interests: ['sports', 'jungle', 'monkeys'],
    context: 'took shortcut in game',
    moralFocus: 'honesty',
  },
  maya: {
    name: 'Maya',
    age: 7,
    interests: ['space', 'stars', 'drawing'],
    context: 'starting new school',
    moralFocus: 'kindness',
  },
};

// Moral Focus Options
export const MORAL_FOCUSES = [
  'honesty',
  'kindness',
  'courage',
  'responsibility',
  'empathy',
  'perseverance',
  'fairness',
  'respect',
] as const;

// Common Interests
export const COMMON_INTERESTS = [
  'sports',
  'animals',
  'space',
  'art',
  'music',
  'nature',
  'science',
  'adventure',
  'magic',
  'dinosaurs',
  'ocean',
  'jungle',
  'robots',
  'fairy tales',
  'superheroes',
] as const;

// Age Range
export const MIN_AGE = 3;
export const MAX_AGE = 12;

// Loading messages for storytelling
export const LOADING_MESSAGES = [
  'Weaving your magical tale...',
  'Painting the stars in your story...',
  'Gathering moonlight for your adventure...',
  'Asking the dream clouds for inspiration...',
  'Sprinkling story dust...',
];
