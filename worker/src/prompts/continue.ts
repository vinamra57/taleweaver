/**
 * Continue Prompt Template
 * From spec section 8: Prompt Templates
 */

export function buildContinuePrompt(
  age: number,
  priorSummary: string,
  chosenOption: string
): string {
  return `Continue the story coherently for age ${age}. Use this prior summary:
${priorSummary}

The chosen option was: ${chosenOption}.
Tone: warm, safe, inclusive. Write SCENE 2 (150–200 words).
Finish with a 1–2 sentence moral reflection addressed to the child (e.g., "Today you learned...").

Return STRICT JSON only:
{
  "scene_text": "...",
  "emotion_hint": "warm|curious|tense|relieved",
  "ending": { "reflection": "..." }
}`;
}
