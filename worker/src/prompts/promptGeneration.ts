/**
 * Phase 1 Prompt: Generate Detailed Story Prompt
 * Takes user inputs and creates a comprehensive prompt for story generation
 */

import type { Child, MoralFocus, StoryLength } from '../schemas/story';
import { getComplexityLevel, getPronouns } from '../services/storyStructure';

export function buildPromptGenerationPrompt(
  child: Child,
  storyLength: StoryLength,
  interactive: boolean,
  moralFocus: MoralFocus
): string {
  const pronouns = getPronouns(child.gender);
  const complexityLevel = getComplexityLevel(child.age_range);
  const contextLine = child.context ? `\nStory context: ${child.context}` : '';

  return `You are a creative children's story consultant. Based on the following information about a child, create a detailed story prompt that will be used to generate an engaging, age-appropriate bedtime story.

CHILD INFORMATION:
- Name: ${child.name}
- Gender: ${child.gender} (use pronouns: ${pronouns.subject}/${pronouns.object}/${pronouns.possessive})
- Age range: ${child.age_range} years old
- Interests: ${child.interests}${contextLine}

STORY REQUIREMENTS:
- Length: ${storyLength} minute${storyLength > 1 ? 's' : ''} (approximately ${storyLength * 150} words)
- Interactive: ${interactive ? 'Yes - story will have choice points where the child decides what happens' : 'No - continuous story without choices'}
- Moral focus: ${moralFocus} - the story should naturally incorporate lessons about ${moralFocus}
- Complexity level: ${complexityLevel} vocabulary and sentence structure for age ${child.age_range}

${
  interactive
    ? `- The story will be split into ${storyLength + 1} segments with ${storyLength} choice points
- Each choice should present a meaningful decision related to ${moralFocus}`
    : ''
}

Create a detailed story prompt that includes:
1. A compelling story premise that incorporates the child's interests
2. The main character (${child.name}) and their personality
3. The setting and initial situation
4. ${interactive ? `Key decision points that relate to ${moralFocus}` : `A clear narrative arc with a satisfying resolution`}
5. ${child.gender === 'male' ? 'Age-appropriate themes and scenarios for boys' : 'Age-appropriate themes and scenarios for girls'}

Return STRICT JSON only:
{
  "story_prompt": "detailed prompt for story generation (3-5 sentences)",
  "story_theme": "optional one-word theme (e.g., friendship, adventure, discovery)"
}`;
}
