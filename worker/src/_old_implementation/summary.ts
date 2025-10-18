/**
 * Summary Service - Prior Summary Generation
 * Builds a 2-3 sentence summary of the story so far
 */

import type { Scene, Choice } from '../schemas/story';
import { createLogger } from '../utils/logger';

const logger = createLogger('Summary Service');

/**
 * Build a prior summary from scenes and choices
 * Returns 2-3 sentences summarizing the story progression
 */
export function buildPriorSummary(
  scenes: Scene[],
  choices: Choice[]
): string {
  try {
    if (scenes.length === 0) {
      return 'The story is just beginning.';
    }

    if (scenes.length === 1 && choices.length === 0) {
      // First scene, no choices yet
      const firstScene = scenes[0];
      const summary = truncateText(firstScene.text, 200);
      return `The story began: ${summary}`;
    }

    if (scenes.length === 1 && choices.length > 0) {
      // One scene, one choice made
      const firstScene = scenes[0];
      const choice = choices[0];
      const summary = truncateText(firstScene.text, 150);
      return `${summary} The child chose option ${choice}.`;
    }

    // Multiple scenes
    const summaryParts: string[] = [];

    // Summarize first scene briefly
    const firstScene = truncateText(scenes[0].text, 100);
    summaryParts.push(`The story began: ${firstScene}`);

    // Add choice information if available
    if (choices.length > 0) {
      summaryParts.push(`The child chose option ${choices[choices.length - 1]}.`);
    }

    return summaryParts.join(' ');
  } catch (error) {
    logger.error('Failed to build prior summary', error);
    return 'The story continues...';
  }
}

/**
 * Truncate text to specified length, ending at word boundary
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }

  const truncated = text.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');

  if (lastSpace > 0) {
    return truncated.slice(0, lastSpace) + '...';
  }

  return truncated + '...';
}
