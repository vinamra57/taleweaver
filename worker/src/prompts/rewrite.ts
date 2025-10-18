/**
 * Workers AI Rewrite Prompt Template
 * From spec section 8: Workers AI (reading-level rewrite)
 */

export function buildRewritePrompt(sceneText: string, age: number): string {
  // Map age to grade level (approximate)
  const targetGrade = age <= 7 ? 2 : 3;
  const ageRange = age <= 7 ? '6-8' : '8-9';

  return `Rewrite the following story text for a grade ${targetGrade} reading level (ages ${ageRange}).
Preserve names, events, and moral tone. Keep it warm, safe, and inclusive.

TEXT:
"""
${sceneText}
"""

Return just the rewritten text.`;
}
