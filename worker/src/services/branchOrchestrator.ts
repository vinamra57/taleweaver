/**
 * Branch Orchestrator Service
 * Handles generation of story branches with parallel TTS and image generation
 */

import type { Env } from '../types/env';
import type { StorySegment, StoryBranch } from '../schemas/story';
import { generateTTS } from './elevenlabs';
import { generateImage } from './imageGeneration';
import { uploadAudio, getAudioUrl, uploadImage, getImageUrl } from './r2';
import { createLogger } from '../utils/logger';

const logger = createLogger('Branch Orchestrator');

/**
 * Create a story segment with audio and image
 * Generates TTS and image in parallel, uploads to R2
 */
export async function createSegmentWithAudio(
  sessionId: string,
  segmentId: string,
  segmentText: string,
  checkpointNumber: number,
  env: Env,
  workerUrl: string,
  choiceText?: string
): Promise<StorySegment> {
  try {
    logger.info(`Creating segment with audio and image: ${segmentId}`);

    // Generate audio and image in parallel
    const [audioUrl, imageUrl] = await Promise.all([
      // Audio pipeline
      (async () => {
        const audioBuffer = await generateTTS(
          segmentText,
          'warm', // Default emotion for bedtime stories
          env
        );
        const audioKey = await uploadAudio(sessionId, segmentId, audioBuffer, env);
        return getAudioUrl(audioKey, env, workerUrl);
      })(),

      // Image pipeline (NEW)
      (async () => {
        const imageBuffer = await generateImage(segmentText, env);
        const imageKey = await uploadImage(sessionId, segmentId, imageBuffer, env);
        return getImageUrl(imageKey, env, workerUrl);
      })(),
    ]);

    const segment: StorySegment = {
      id: segmentId,
      text: segmentText,
      audio_url: audioUrl,
      image_url: imageUrl, // Generated image (required - will throw if generation fails)
      checkpoint_number: checkpointNumber,
      choice_text: choiceText,
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
          workerUrl,
          choiceTextA
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
          workerUrl,
          choiceTextB
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
