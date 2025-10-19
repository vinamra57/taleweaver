/**
 * Async Branch Generation Service
 * Handles background generation of story branches while user listens to audio
 */

import type { Env } from '../types/env';
import type { Session } from '../schemas/story';
import { generateFirstSegment, generateContinuation } from './gemini';
import { createBranchesInParallel } from './branchOrchestrator';
import { getSession, saveSession } from './kv';
import { buildFirstSegmentPrompt, buildContinuationPrompt } from '../prompts/storyGeneration';
import { createLogger } from '../utils/logger';

const logger = createLogger('Async Branch Generation');

/**
 * Generate first set of branches in the background
 * Called after returning the first segment to the user
 */
export async function generateFirstBranchesAsync(
  sessionId: string,
  env: Env,
  workerUrl: string
): Promise<void> {
  try {
    logger.info('Starting async generation of first branches', { sessionId });

    // Fetch the current session
    const session = await getSession(sessionId, env);

    // Mark generation as in progress
    session.generation_in_progress = true;
    await saveSession(session, env);

    // Build prompt for first segment
    const firstSegmentPrompt = buildFirstSegmentPrompt(
      session.story_prompt,
      session.child,
      session.moral_focus,
      session.words_per_segment
    );

    // Generate first segment with branches
    const firstSegmentResponse = await generateFirstSegment(firstSegmentPrompt, env);

    // Create both branches in parallel (for checkpoint 0 → 1) using session voice
    // Fallback to default voice if narrator_voice_id is not set (for old sessions)
    const voiceId = session.narrator_voice_id || env.ELEVENLABS_VOICE_ID;

    const branches = await createBranchesInParallel(
      sessionId,
      firstSegmentResponse.choice_a.text,
      firstSegmentResponse.choice_a.next_segment,
      firstSegmentResponse.choice_b.text,
      firstSegmentResponse.choice_b.next_segment,
      1, // next checkpoint number
      'segment_2', // base ID for next segments
      env,
      workerUrl,
      voiceId
    );

    // Update session with generated branches
    session.segments.push(branches[0].segment, branches[1].segment);
    session.next_branches_ready = true;
    session.generation_in_progress = false;
    await saveSession(session, env);

    logger.info('First branches generated successfully', { sessionId });
  } catch (error) {
    logger.error('Failed to generate first branches asynchronously', error);

    // Try to mark generation as failed in session
    try {
      const session = await getSession(sessionId, env);
      session.generation_in_progress = false;
      session.next_branches_ready = false;
      await saveSession(session, env);
    } catch (saveError) {
      logger.error('Failed to update session after generation error', saveError);
    }
  }
}

/**
 * Generate next set of branches in the background
 * Called after user makes a choice and starts listening to the chosen segment
 */
export async function generateNextBranchesAsync(
  sessionId: string,
  currentCheckpoint: number,
  chosenSegmentText: string,
  env: Env,
  workerUrl: string
): Promise<void> {
  try {
    logger.info('Starting async generation of next branches', {
      sessionId,
      currentCheckpoint,
    });

    // Fetch the current session
    const session = await getSession(sessionId, env);

    // Mark generation as in progress
    session.generation_in_progress = true;
    session.next_branches_ready = false;
    await saveSession(session, env);

    // Check if we've reached the final checkpoint
    if (currentCheckpoint >= session.total_checkpoints) {
      logger.info('Final checkpoint reached, no more branches to generate', {
        sessionId,
      });
      session.generation_in_progress = false;
      await saveSession(session, env);
      return;
    }

    // Build prompt for continuation
    const continuationPrompt = buildContinuationPrompt(
      session.story_prompt,
      session.child,
      session.moral_focus,
      session.words_per_segment,
      session.chosen_path,
      currentCheckpoint,
      session.total_checkpoints,
      chosenSegmentText
    );

    // Generate next branches with Gemini
    const continuationResponse = await generateContinuation(continuationPrompt, env);

    // Determine next checkpoint number
    const nextCheckpointNumber = currentCheckpoint + 1;

    // Generate both branches in parallel using session voice
    // Fallback to default voice if narrator_voice_id is not set (for old sessions)
    const voiceId = session.narrator_voice_id || env.ELEVENLABS_VOICE_ID;

    const branches = await createBranchesInParallel(
      sessionId,
      continuationResponse.choice_a?.text || 'Choice A',
      continuationResponse.choice_a?.next_segment || '',
      continuationResponse.choice_b?.text || 'Choice B',
      continuationResponse.choice_b?.next_segment || '',
      nextCheckpointNumber,
      `segment_${nextCheckpointNumber + 1}`,
      env,
      workerUrl,
      voiceId
    );

    // Update session with generated branches
    session.segments.push(branches[0].segment, branches[1].segment);
    session.next_branches_ready = true;
    session.generation_in_progress = false;
    await saveSession(session, env);

    logger.info('Next branches generated successfully', {
      sessionId,
      checkpoint: nextCheckpointNumber,
    });
  } catch (error) {
    logger.error('Failed to generate next branches asynchronously', error);

    // Try to mark generation as failed in session
    try {
      const session = await getSession(sessionId, env);
      session.generation_in_progress = false;
      session.next_branches_ready = false;
      await saveSession(session, env);
    } catch (saveError) {
      logger.error('Failed to update session after generation error', saveError);
    }
  }
}
