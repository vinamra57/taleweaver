/**
 * PlayBook - Interactive story display with book-style UI and page flip animations
 * This is a simplified version focused on the book experience
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StoryLoadingState, ErrorState } from '../components/LoadingStates';
import { BookContainer, Book, LeftPage, RightPage, MobileSinglePage } from '../components/Book';
import {
  ChoiceId,
  StoredStorySession,
} from '../lib/types';
import { STORY_SESSION_STORAGE_KEY } from '../lib/constants';
import api from '../lib/api';

export const PlayBook: React.FC = () => {
  const navigate = useNavigate();
  const [sessionState, setSessionState] = useState<StoredStorySession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFlipping, setIsFlipping] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Restore story session from storage
  useEffect(() => {
    const stored = sessionStorage.getItem(STORY_SESSION_STORAGE_KEY);
    if (!stored) {
      navigate('/create');
      return;
    }

    try {
      const parsed: StoredStorySession = JSON.parse(stored);

      if (!parsed.session_id || !parsed.child || !parsed.settings) {
        throw new Error('Session data incomplete');
      }

      if (parsed.settings.interactive) {
        if (!parsed.interactive_state) {
          throw new Error('Missing interactive story state');
        }

        if (!parsed.interactive_state.history?.length) {
          parsed.interactive_state.history = [parsed.interactive_state.current_segment];
        }
      }

      setSessionState(parsed);
    } catch (err) {
      console.error('Failed to restore story session', err);
      sessionStorage.removeItem(STORY_SESSION_STORAGE_KEY);
      navigate('/create');
    }
  }, [navigate]);

  // Persist updates back into storage
  useEffect(() => {
    if (sessionState) {
      sessionStorage.setItem(
        STORY_SESSION_STORAGE_KEY,
        JSON.stringify(sessionState),
      );
    }
  }, [sessionState]);

  // Poll for branch readiness when next_options is empty
  useEffect(() => {
    if (!sessionState?.settings.interactive || !sessionState.interactive_state) {
      return;
    }

    const { next_options } = sessionState.interactive_state;
    const hasReachedFinal = sessionState.reached_final;

    // Only poll if we don't have options yet and haven't reached the end
    if (next_options.length > 0 || hasReachedFinal) {
      return;
    }

    const pollInterval = setInterval(async () => {
      try {
        const currentCheckpoint = sessionState.interactive_state?.current_segment.checkpoint_index ?? 0;
        const nextCheckpoint = currentCheckpoint + 1;

        const branchesData = await api.getBranches(sessionState.session_id, nextCheckpoint);

        if (branchesData.branches_ready && branchesData.branches.length > 0) {
          const nextOptions = branchesData.branches.slice(0, 2).map((br, i) => ({
            id: (br.id ?? (['A', 'B'] as const)[i]) as ChoiceId,
            label: br.label ?? ((['A', 'B'] as const)[i] === 'A' ? 'Choice A' : 'Choice B'),
            segment: {
              from_checkpoint: currentCheckpoint,
              to_checkpoint: nextCheckpoint,
              text: br.segment.text,
              emotion_hint: br.segment.emotion_hint ?? 'warm',
              audio_url: br.segment.audio_url,
              image_url: br.segment.image_url, // NEW: Include image URL
            },
          }));

          setSessionState((prev) => {
            if (!prev?.interactive_state) return prev;

            return {
              ...prev,
              interactive_state: {
                ...prev.interactive_state,
                next_options: nextOptions,
              },
            };
          });

          clearInterval(pollInterval);
        }
      } catch (err) {
        console.error('[Polling] Failed to fetch branches:', err);
      }
    }, 1000); // Poll every second

    return () => clearInterval(pollInterval);
  }, [sessionState]);

  // Handle choice selection with page flip animation
  const handleChoiceSelect = async (choiceId: ChoiceId) => {
    if (!sessionState?.interactive_state) return;

    const choice = sessionState.interactive_state.next_options.find(
      (opt) => opt.id === choiceId
    );

    if (!choice) return;

    // Start page flip animation
    setIsFlipping(true);
    setIsLoading(true);

    // Wait for half the flip duration before fetching
    await new Promise((resolve) => setTimeout(resolve, 600));

    try {
      const currentCheckpoint = sessionState.interactive_state.current_segment.checkpoint_index;

      const response = await api.continueStory({
        session_id: sessionState.session_id,
        from_checkpoint: currentCheckpoint,
        chosen: choiceId,
      });

      // Wait for the rest of the flip duration
      await new Promise((resolve) => setTimeout(resolve, 600));

      // Update state with new segment
      const newSegment = {
        checkpoint_index: choice.segment.to_checkpoint,
        text: choice.segment.text,
        emotion_hint: choice.segment.emotion_hint,
        audio_url: choice.segment.audio_url,
        image_url: choice.segment.image_url, // NEW
      };

      setSessionState((prev) => {
        if (!prev?.interactive_state) return prev;

        return {
          ...prev,
          interactive_state: {
            ...prev.interactive_state,
            current_segment: newSegment,
            history: [...prev.interactive_state.history, newSegment],
            next_options: response.next_options || [],
          },
          reached_final: response.is_final_segment || false,
        };
      });

      setIsFlipping(false);
      setIsLoading(false);
    } catch (err: any) {
      console.error('Failed to continue story:', err);
      setError(err.message || 'Failed to continue story');
      setIsFlipping(false);
      setIsLoading(false);
    }
  };

  const handleStartNewStory = () => {
    sessionStorage.removeItem(STORY_SESSION_STORAGE_KEY);
    navigate('/create');
  };

  if (!sessionState) {
    return <StoryLoadingState message="Loading your story..." />;
  }

  if (error) {
    return (
      <ErrorState
        error={error}
        onRetry={() => setError(null)}
      />
    );
  }

  if (!sessionState.settings.interactive) {
    // For non-interactive, redirect to original Play component
    navigate('/play');
    return null;
  }

  const { current_segment, next_options } = sessionState.interactive_state!;
  const hasReachedFinal = sessionState.reached_final;

  const choices = next_options.map((opt) => ({
    id: opt.id,
    label: opt.label,
  }));

  // Mobile view - single page layout
  if (isMobile) {
    return (
      <div className="min-h-screen p-4">
        <MobileSinglePage
          imageUrl={current_segment.image_url}
          checkpointNumber={current_segment.checkpoint_index}
          text={current_segment.text}
          audioUrl={current_segment.audio_url}
          choices={hasReachedFinal ? [] : choices}
          onChoiceClick={handleChoiceSelect}
          isLoading={isLoading}
        />

        {hasReachedFinal && (
          <div className="text-center mt-8">
            <button onClick={handleStartNewStory} className="btn-primary">
              Start New Story
            </button>
          </div>
        )}
      </div>
    );
  }

  // Desktop view - book layout with page flip
  return (
    <BookContainer isFlipping={isFlipping}>
      <div className={isFlipping ? 'animate-page-flip-out' : 'animate-page-flip-in'}>
        <Book
          leftPage={
            <LeftPage
              imageUrl={current_segment.image_url}
              pageNumber={current_segment.checkpoint_index * 2}
              isLoading={false}
            />
          }
          rightPage={
            <RightPage
              checkpointNumber={current_segment.checkpoint_index}
              text={current_segment.text}
              audioUrl={current_segment.audio_url}
              choices={hasReachedFinal ? [] : choices}
              onChoiceClick={handleChoiceSelect}
              pageNumber={current_segment.checkpoint_index * 2 + 1}
              isLoading={isLoading}
              showChoices={!hasReachedFinal}
            />
          }
          isFlipping={isFlipping}
        />
      </div>

      {hasReachedFinal && (
        <div className="text-center mt-8">
          <div className="animate-float mb-4 text-6xl">🌟</div>
          <h2 className="text-3xl font-display text-bedtime-purple mb-4">The End</h2>
          <p className="text-bedtime-purple/80 mb-6">What a wonderful story!</p>
          <button onClick={handleStartNewStory} className="btn-primary">
            Start New Story
          </button>
        </div>
      )}
    </BookContainer>
  );
};
