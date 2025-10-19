/**
 * Preset Narrator Voices
 * Predefined character voices for story narration
 */

export type PresetVoice = 'princess' | 'scientist' | 'pirate' | 'coach' | 'explorer';

export interface VoiceMetadata {
  id: string;
  name: string;
  description: string;
  vocal_tags?: string[]; // Tags to guide ElevenLabs Music singer style
}

export const PRESET_VOICES: Record<PresetVoice, VoiceMetadata> = {
  princess: {
    id: 'YIwySL1WifAPjXRMYxkh',
    name: 'Princess',
    description: 'A high-pitched, clear female voice in her 20s with a melodious, gentle, and elegant tone. Speaking at a smooth, unhurried pace, the voice carries a feeling of grace, kindness, and refinement.',
    vocal_tags: ['vocal_female','soprano','airy','gentle','bright','soft_vibrato','lullaby','clear_articulation'],
  },
  scientist: {
    id: 'udNT7cHxdthx3LETLQLy',
    name: 'Scientist',
    description: 'A medium-low male voice in his 40s with a precise, hyper-articulate tone. The delivery is intellectual and slightly quirky, often speaking at a quick, excited pace and featuring a subtle technical or robotic filter.',
    vocal_tags: ['vocal_male','tenor','clear_articulation','precise','neutral','pop_ballad','bright','steady'],
  },
  pirate: {
    id: 'f4amWE270zjzmi2YweAA',
    name: 'Pirate',
    description: 'A deep, throaty male voice in his 50s with a gravelly and boisterous texture. The tone is rough yet good-natured, delivered at a lively pace with a pronounced, rolling accent that suggests a life of adventure at sea.',
    vocal_tags: ['vocal_male','baritone','gravelly','boisterous','bold','sea_chanty','adventurous','projected'],
  },
  coach: {
    id: 'dXB5RMMppnpAvpr9WJBu',
    name: 'Coach',
    description: 'A medium-pitch, strong female voice in her late 30s that is energetic and slightly loud. The tone is encouraging and direct, using a fast, motivational pace as if shouting instructions from the sidelines.',
    vocal_tags: ['vocal_female','mezzo_soprano','energetic','projected','staccato','bright','motivational'],
  },
  explorer: {
    id: '7X5dNuxmpGUsCE49iZzJ',
    name: 'Explorer',
    description: 'A smooth, confident female voice in her 30s with a crisp, clear American accent. The tone is adventurous and curious, delivered at a steady, inquisitive pace that suggests a hero observing a new discovery.',
    vocal_tags: ['vocal_female','alto','confident','warm','clear','adventurous','steady'],
  },
} as const;

export type VoiceSelection = 'custom' | PresetVoice;

/**
 * Get voice ID for a given voice selection
 * Returns undefined for 'custom' (will be generated dynamically)
 */
export function getVoiceId(selection: VoiceSelection): string | undefined {
  if (selection === 'custom') {
    return undefined;
  }
  return PRESET_VOICES[selection].id;
}

/**
 * Check if a voice selection is a preset
 */
export function isPresetVoice(selection: VoiceSelection): selection is PresetVoice {
  return selection !== 'custom';
}

/**
 * Get vocal style tags for a given preset (if any)
 */
export function getVocalTags(selection: VoiceSelection): string[] | undefined {
  if (selection === 'custom') return undefined;
  return PRESET_VOICES[selection].vocal_tags;
}
