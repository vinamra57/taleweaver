/**
 * Phase 2 Prompts: Generate Story Segments
 * Takes the detailed prompt and generates actual story text
 */

import type { Child, MoralFocus, BranchChoice } from '../schemas/story';
import { getComplexityLevel, getPronouns } from '../services/storyStructure';

/**
 * Generate non-interactive story (single continuous narrative)
 */
export function buildNonInteractiveStoryPrompt(
  storyPrompt: string,
  child: Child,
  moralFocus: MoralFocus,
  totalWords: number
): string {
  const pronouns = getPronouns(child.gender);
  const complexityLevel = getComplexityLevel(child.age_range);

  return `You are a children's storyteller. Write a complete bedtime story based on this detailed prompt:

${storyPrompt}

REQUIREMENTS:
- Main character: ${child.name} (${child.gender}, use ${pronouns.subject}/${pronouns.object}/${pronouns.possessive})
- Length: EXACTLY ${totalWords} words
- Complexity: ${complexityLevel} vocabulary for ages ${child.age_range}
- Moral focus: ${moralFocus} - weave this naturally into the story
- Tone: warm, engaging, bedtime-appropriate (no scary content)
- Ending: satisfying conclusion with a gentle moral lesson about ${moralFocus}

Return STRICT JSON only:
{
  "story_text": "the complete story in ${totalWords} words"
}`;
}

/**
 * Generate first interactive segment with branching choices
 */
export function buildFirstSegmentPrompt(
  storyPrompt: string,
  child: Child,
  moralFocus: MoralFocus,
  wordsPerSegment: number
): string {
  const pronouns = getPronouns(child.gender);
  const complexityLevel = getComplexityLevel(child.age_range);

  return `You are a children's storyteller creating an interactive bedtime story. Write the FIRST SEGMENT based on this prompt:

${storyPrompt}

REQUIREMENTS FOR SEGMENT 1:
- Main character: ${child.name} (${child.gender}, use ${pronouns.subject}/${pronouns.object}/${pronouns.possessive})
- Length: EXACTLY ${wordsPerSegment} words
- Complexity: ${complexityLevel} vocabulary for ages ${child.age_range}
- Tone: warm, engaging, bedtime-appropriate
- End at a decision point related to ${moralFocus}

CRITICAL: Present TWO meaningful choices (A and B) that:
1. Relate to the moral lesson of ${moralFocus}
2. Have different but equally valid outcomes
3. Are age-appropriate for ${child.age_range}
4. Continue the story naturally

For each choice, write the NEXT SEGMENT (also ${wordsPerSegment} words) that follows if that choice is made.

Return STRICT JSON only:
{
  "segment_text": "opening segment in ${wordsPerSegment} words",
  "choice_prompt": "question asking what ${child.name} should do",
  "choice_a": {
    "text": "first choice option (relates to ${moralFocus})",
    "next_segment": "continuation if A is chosen (${wordsPerSegment} words)"
  },
  "choice_b": {
    "text": "second choice option (relates to ${moralFocus})",
    "next_segment": "continuation if B is chosen (${wordsPerSegment} words)"
  }
}`;
}

/**
 * Generate continuation segments after a choice
 */
export function buildContinuationPrompt(
  storyPrompt: string,
  child: Child,
  moralFocus: MoralFocus,
  wordsPerSegment: number,
  chosenPath: BranchChoice[],
  currentCheckpoint: number,
  totalCheckpoints: number,
  previousSegmentText: string
): string {
  const pronouns = getPronouns(child.gender);
  const complexityLevel = getComplexityLevel(child.age_range);
  const isFinal = currentCheckpoint === totalCheckpoints;

  const pathDescription = chosenPath
    .map((choice, index) => `Choice ${index + 1}: ${choice}`)
    .join(', ');

  if (isFinal) {
    // Final segment - no more choices
    return `You are continuing an interactive children's story. Write the FINAL SEGMENT.

STORY CONTEXT:
${storyPrompt}

PREVIOUS SEGMENT:
${previousSegmentText}

PATH TAKEN SO FAR:
${pathDescription}

REQUIREMENTS FOR FINAL SEGMENT:
- Main character: ${child.name} (${child.gender}, use ${pronouns.subject}/${pronouns.object}/${pronouns.possessive})
- Length: EXACTLY ${wordsPerSegment} words
- Complexity: ${complexityLevel} vocabulary for ages ${child.age_range}
- Tone: warm, satisfying, bedtime-appropriate
- Ending: Complete the story with a gentle moral lesson about ${moralFocus}

Return STRICT JSON only:
{
  "choice_prompt": null,
  "choice_a": null,
  "choice_b": null
}

Note: Since this is the final segment, return null for choice fields. The final segment text will be provided separately.`;
  }

  // Continuation with more choices
  return `You are continuing an interactive children's story. Write the NEXT SEGMENT with new choices.

STORY CONTEXT:
${storyPrompt}

PREVIOUS SEGMENT:
${previousSegmentText}

PATH TAKEN SO FAR:
${pathDescription}

REQUIREMENTS FOR SEGMENT ${currentCheckpoint + 1}:
- Main character: ${child.name} (${child.gender}, use ${pronouns.subject}/${pronouns.object}/${pronouns.possessive})
- Length per segment: EXACTLY ${wordsPerSegment} words
- Complexity: ${complexityLevel} vocabulary for ages ${child.age_range}
- Tone: warm, engaging, bedtime-appropriate
- End at a NEW decision point related to ${moralFocus}

Present TWO new meaningful choices (A and B) that:
1. Build on the previous choices and current situation
2. Relate to ${moralFocus}
3. Have different but equally valid outcomes
4. Continue the story naturally toward a conclusion

For each choice, write the NEXT SEGMENT (${wordsPerSegment} words) that follows.

Return STRICT JSON only:
{
  "choice_prompt": "question asking what ${child.name} should do next",
  "choice_a": {
    "text": "first choice option",
    "next_segment": "continuation if A is chosen (${wordsPerSegment} words)"
  },
  "choice_b": {
    "text": "second choice option",
    "next_segment": "continuation if B is chosen (${wordsPerSegment} words)"
  }
}`;
}
