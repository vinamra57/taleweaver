/**
 * Phase 2 Prompts: Generate Story Segments
 * Takes the detailed prompt and generates actual story text
 */

import type { Child, MoralFocus, BranchChoice } from '../schemas/story';
import { getComplexityLevel, getPronouns, getAgeAppropriateGuidelines } from '../services/storyStructure';
import { MORAL_THEME_MAP } from '../schemas/selThemes';

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
  const guidelines = getAgeAppropriateGuidelines(child.age_range);

  return `You are a children's storyteller. Write a complete bedtime story based on this detailed prompt:

${storyPrompt}

REQUIREMENTS:
- Main character: ${child.name} (${child.gender}, use ${pronouns.subject}/${pronouns.object}/${pronouns.possessive})
- Length: EXACTLY ${totalWords} words
- Moral focus: ${moralFocus} - weave this naturally into the story
- Tone: warm, engaging, bedtime-appropriate (no scary content)
- Ending: satisfying conclusion with a gentle moral lesson about ${moralFocus}

AGE-APPROPRIATE LANGUAGE (Ages ${child.age_range}):
- Reading Level: ${guidelines.reading_level}
- Vocabulary: ${guidelines.vocabulary_level}
- Sentence Structure: ${guidelines.sentence_length}
- Use words like: ${guidelines.example_vocabulary.slice(0, 8).join(', ')}
- AVOID words like: ${guidelines.avoid_vocabulary.slice(0, 5).join(', ')}
- Maximum ${guidelines.max_syllables_per_word} syllables per word

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
  const guidelines = getAgeAppropriateGuidelines(child.age_range);
  const moralMapping = MORAL_THEME_MAP[moralFocus];

  return `You are a children's storyteller creating an interactive bedtime story. Write the FIRST SEGMENT based on this prompt:

${storyPrompt}

REQUIREMENTS FOR SEGMENT 1:
- Main character: ${child.name} (${child.gender}, use ${pronouns.subject}/${pronouns.object}/${pronouns.possessive})
- Length: EXACTLY ${wordsPerSegment} words
- Tone: warm, engaging, bedtime-appropriate
- End at a decision point related to ${moralFocus}

AGE-APPROPRIATE LANGUAGE (Ages ${child.age_range}):
- Reading Level: ${guidelines.reading_level}
- Vocabulary: ${guidelines.vocabulary_level}
- Sentence Structure: ${guidelines.sentence_length}
- Use words like: ${guidelines.example_vocabulary.slice(0, 8).join(', ')}
- AVOID words like: ${guidelines.avoid_vocabulary.slice(0, 5).join(', ')}
- Maximum ${guidelines.max_syllables_per_word} syllables per word

CRITICAL - CHOICE DESIGN FOR "${moralFocus}":
Present TWO meaningful choices (A and B) where:

Choice A should be GROWTH-ORIENTED:
- Demonstrates the moral lesson of ${moralFocus}
- Uses keywords like: ${moralMapping.growth_keywords.slice(0, 5).join(', ')}
- Shows positive social-emotional learning
- Mark this choice with "quality": "growth_oriented"

Choice B should be LESS IDEAL (but not harmful):
- A valid option but misses the growth opportunity
- May use concepts like: ${moralMapping.less_ideal_keywords.slice(0, 3).join(', ')}
- Natural alternative a child might consider
- Mark this choice with "quality": "less_ideal"

IMPORTANT: Both choices continue the story, but Choice A should lead to outcomes demonstrating the value of ${moralFocus}, while Choice B shows why the lesson matters through gentle consequences.

For each choice, write the NEXT SEGMENT (also ${wordsPerSegment} words) that naturally shows the outcome of that decision.

Return STRICT JSON only:
{
  "segment_text": "opening segment in ${wordsPerSegment} words",
  "choice_prompt": "question asking what ${child.name} should do",
  "choice_a": {
    "text": "growth-oriented choice (relates to ${moralFocus})",
    "quality": "growth_oriented",
    "next_segment": "positive outcome continuation (${wordsPerSegment} words)"
  },
  "choice_b": {
    "text": "less ideal but valid alternative choice",
    "quality": "less_ideal",
    "next_segment": "gentle learning opportunity continuation (${wordsPerSegment} words)"
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
  const guidelines = getAgeAppropriateGuidelines(child.age_range);
  const moralMapping = MORAL_THEME_MAP[moralFocus];
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
- Tone: warm, satisfying, bedtime-appropriate
- Ending: Complete the story with a gentle moral lesson about ${moralFocus}

AGE-APPROPRIATE LANGUAGE (Ages ${child.age_range}):
- Reading Level: ${guidelines.reading_level}
- Vocabulary: ${guidelines.vocabulary_level}
- Sentence Structure: ${guidelines.sentence_length}
- Use words like: ${guidelines.example_vocabulary.slice(0, 8).join(', ')}
- AVOID words like: ${guidelines.avoid_vocabulary.slice(0, 5).join(', ')}
- Maximum ${guidelines.max_syllables_per_word} syllables per word

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
- Tone: warm, engaging, bedtime-appropriate
- End at a NEW decision point related to ${moralFocus}

AGE-APPROPRIATE LANGUAGE (Ages ${child.age_range}):
- Reading Level: ${guidelines.reading_level}
- Vocabulary: ${guidelines.vocabulary_level}
- Sentence Structure: ${guidelines.sentence_length}
- Use words like: ${guidelines.example_vocabulary.slice(0, 8).join(', ')}
- AVOID words like: ${guidelines.avoid_vocabulary.slice(0, 5).join(', ')}
- Maximum ${guidelines.max_syllables_per_word} syllables per word

CRITICAL - CHOICE DESIGN FOR "${moralFocus}":
Present TWO new meaningful choices (A and B) that build on previous decisions:

Choice A should be GROWTH-ORIENTED:
- Continues to demonstrate ${moralFocus}
- Uses keywords like: ${moralMapping.growth_keywords.slice(0, 5).join(', ')}
- Builds on any positive choices already made
- Mark this choice with "quality": "growth_oriented"

Choice B should be LESS IDEAL (but not harmful):
- Natural alternative that misses the learning opportunity
- May use concepts like: ${moralMapping.less_ideal_keywords.slice(0, 3).join(', ')}
- Shows contrast to help reinforce the lesson
- Mark this choice with "quality": "less_ideal"

For each choice, write the NEXT SEGMENT (${wordsPerSegment} words) that shows the outcome.

Return STRICT JSON only:
{
  "choice_prompt": "question asking what ${child.name} should do next",
  "choice_a": {
    "text": "growth-oriented choice",
    "quality": "growth_oriented",
    "next_segment": "positive outcome continuation (${wordsPerSegment} words)"
  },
  "choice_b": {
    "text": "less ideal alternative choice",
    "quality": "less_ideal",
    "next_segment": "gentle learning opportunity continuation (${wordsPerSegment} words)"
  }
}`;
}
