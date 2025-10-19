import { Child, Gender, AgeGroup, DurationMin, PresetVoice } from './types';
import type { MoralFocus } from './types';

// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export interface CharacterPreset {
  child: Child;
  duration_min: DurationMin;
  interactive: boolean;
}

// Default settings
export const DEFAULT_DURATION_MIN: DurationMin = 2;
export const DEFAULT_INTERACTIVE = true;
export const MAX_INTERESTS = 5;
export const MORAL_FOCI: MoralFocus[] = [
  'kindness',
  'honesty',
  'courage',
  'sharing',
  'perseverance',
];

export const DEFAULT_MORAL_FOCUS: MoralFocus = 'kindness';

// Character Presets
export const CHARACTER_PRESETS: Record<string, CharacterPreset> = {
  arjun: {
    child: {
      name: 'Arjun',
      gender: 'male',
      age_group: '7-9',
      interests: ['sports', 'jungle', 'monkeys'],
      context: 'took shortcut in game',
    },
    duration_min: 2,
    interactive: true,
  },
  maya: {
    child: {
      name: 'Maya',
      gender: 'female',
      age_group: '7-9',
      interests: ['space', 'stars', 'drawing'],
      context: 'starting new school',
    },
    duration_min: 2,
    interactive: true,
  },
};

// Gender Options
export const GENDERS: Gender[] = ['male', 'female'];

// Age Group Options
export const AGE_GROUPS: AgeGroup[] = ['4-6', '7-9', '10-12'];

// Duration Options
export const DURATIONS: DurationMin[] = [1, 2, 3];

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

// Loading messages for storytelling
export const LOADING_MESSAGES = [
  'Weaving your magical tale...',
  'Painting the stars in your story...',
  'Gathering moonlight for your adventure...',
  'Asking the dream clouds for inspiration...',
  'Sprinkling story dust...',
];

// Session storage key
export const STORY_SESSION_STORAGE_KEY = 'taleweaver.storySession';

// Voice Narrator Options
export interface VoiceOption {
  id: 'custom' | 'clone' | PresetVoice;
  name: string;
  icon: string;
  description: string;
}

export const VOICE_OPTIONS: VoiceOption[] = [
  {
    id: 'custom',
    name: 'Custom Voice',
    icon: '✨',
    description: 'AI-generated voice tailored to your story theme',
  },
  {
    id: 'clone',
    name: 'Clone Your Voice',
    icon: '🎤',
    description: 'Record or upload your voice for personalized narration',
  },
  {
    id: 'princess',
    name: 'Princess',
    icon: '👑',
    description: 'Gentle, melodious voice with graceful elegance',
  },
  {
    id: 'scientist',
    name: 'Scientist',
    icon: '🔬',
    description: 'Intellectual, precise voice with quirky excitement',
  },
  {
    id: 'pirate',
    name: 'Pirate',
    icon: '🏴‍☠️',
    description: 'Boisterous, gravelly voice with adventurous spirit',
  },
  {
    id: 'coach',
    name: 'Coach',
    icon: '🏃‍♀️',
    description: 'Energetic, motivational voice with encouraging tone',
  },
  {
    id: 'explorer',
    name: 'Explorer',
    icon: '🧭',
    description: 'Confident, curious voice full of discovery',
  },
];
