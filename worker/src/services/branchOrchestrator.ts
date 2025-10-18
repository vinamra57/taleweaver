/**
 * Branch Orchestrator Service
 * Handles generation of story branches and parallel TTS generation
 */

import type { Env } from '../types/env';
import type { StorySegment, StoryBranch } from '../schemas/story';
import { generateTTS } from './elevenlabs';
import { uploadAudio, getAudioUrl } from './r2';
import { createLogger } from '../utils/logger';

const logger = createLogger('Branch Orchestrator');

/**
 * Create a story segment with audio
 * Generates TTS and uploads to R2
 */
export async function createSegmentWithAudio(
  sessionId: string,
  segmentId: string,
  segmentText: string,
  checkpointNumber: number,
  env: Env,
  workerUrl: string
): Promise<StorySegment> {
  try {
    logger.info(`Creating segment with audio: ${segmentId}`);

    // Generate TTS audio
    const audioBuffer = await generateTTS(
      segmentText,
      'warm', // Default emotion for bedtime stories
      env
    );

    // Upload to R2
    const audioKey = await uploadAudio(sessionId, segmentId, audioBuffer, env);

    // Get audio URL
    const audioUrl = getAudioUrl(audioKey, env, workerUrl);

    const segment: StorySegment = {
      id: segmentId,
      text: segmentText,
      audio_url: audioUrl,
      checkpoint_number: checkpointNumber,
    };

    logger.info(`Segment created successfully: ${segmentId}`);
    return segment;
  } catch (error) {
    logger.error(`Failed to create segment: ${segmentId}`, error);
    throw error;
  }
}

/**
 * Create both branches in parallel (for pre-generation)
 * This is called after user makes a choice to generate the NEXT two branches
 */
export async function createBranchesInParallel(
  sessionId: string,
  choiceTextA: string,
  segmentTextA: string,
  choiceTextB: string,
  segmentTextB: string,
  nextCheckpointNumber: number,
  baseSegmentId: string,
  env: Env,
  workerUrl: string
): Promise<[StoryBranch, StoryBranch]> {
  try {
    logger.info(`Creating branches in parallel for checkpoint ${nextCheckpointNumber}`);

    // Generate both branches in parallel
    const [branchA, branchB] = await Promise.all([
      // Branch A
      (async () => {
        const segmentA = await createSegmentWithAudio(
          sessionId,
          `${baseSegmentId}a`,
          segmentTextA,
          nextCheckpointNumber,
          env,
          workerUrl
        );

        const branch: StoryBranch = {
          choice_text: choiceTextA,
          choice_value: 'A',
          segment: segmentA,
        };

        return branch;
      })(),

      // Branch B
      (async () => {
        const segmentB = await createSegmentWithAudio(
          sessionId,
          `${baseSegmentId}b`,
          segmentTextB,
          nextCheckpointNumber,
          env,
          workerUrl
        );

        const branch: StoryBranch = {
          choice_text: choiceTextB,
          choice_value: 'B',
          segment: segmentB,
        };

        return branch;
      })(),
    ]);

    logger.info(`Both branches created successfully for checkpoint ${nextCheckpointNumber}`);
    return [branchA, branchB];
  } catch (error) {
    logger.error('Failed to create branches in parallel', error);
    throw error;
  }
}

/**
 * Get the segment ID for a specific checkpoint and branch
 */
export function getSegmentIdForBranch(
  checkpointNumber: number,
  branch: 'A' | 'B'
): string {
  const segmentNumber = checkpointNumber + 1;
  return `segment_${segmentNumber}${branch.toLowerCase()}`;
}
