/**
 * Start Prompt Template
 * From spec section 8: Prompt Templates
 */

import type { Child, MoralFocus } from '../schemas/story';

export function buildStartPrompt(child: Child, moralFocus: MoralFocus): string {
  const interestsList =
    child.interests.length > 0
      ? child.interests.join(', ')
      : 'everyday adventures';

  const contextLine = child.context
    ? `Context: ${child.context}`
    : '';

  return `You are a children's storyteller creating age-appropriate bedtime stories for age ${child.age}.

Write SCENE 1 (150–200 words) starring ${child.name}.
Include interests: ${interestsList}.
${contextLine}
Moral focus: ${moralFocus} (one of: kindness, honesty, courage, sharing, perseverance).
Tone: warm, safe, inclusive, bedtime-friendly. Avoid scary content, labels, or shame.

End SCENE 1 with a natural A/B decision for the child (no outcome yet).

Return STRICT JSON only:
{
  "scene_text": "...",
  "emotion_hint": "warm|curious|tense|relieved",
  "choice": { "prompt": "...", "options": ["...", "..."] }
}`;
}
