import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StoryLoadingState, ErrorState } from '../components/LoadingStates';
import {
  ChoiceId,
  ChoiceOption,
  CheckpointSegment,
  EmotionHint,
  StoredStorySession,
} from '../lib/types';
import { STORY_SESSION_STORAGE_KEY } from '../lib/constants';
import api from '../lib/api';

const emotionLabels: Record<EmotionHint, string> = {
  warm: 'Warm',
  curious: 'Curious',
  tense: 'Tense',
  relieved: 'Relieved',
};

const formatEmotion = (emotion: EmotionHint) => emotionLabels[emotion] || emotion;

export const Play: React.FC = () => {
  const navigate = useNavigate();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [sessionState, setSessionState] = useState<StoredStorySession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      } else if (!parsed.non_interactive_state) {
        throw new Error('Missing story segments');
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

  const interactiveAudioUrl =
    sessionState?.interactive_state?.current_segment.audio_url;
  const firstNonInteractiveAudioUrl =
    sessionState?.non_interactive_state?.segments?.[0]?.audio_url;
  const isInteractiveMode = !!sessionState?.settings.interactive;

  // Auto-play current segment
  useEffect(() => {
    const audioEl = audioRef.current;
    if (!audioEl) {
      return;
    }

    if (isInteractiveMode) {
      if (!interactiveAudioUrl) {
        return;
      }
      audioEl.src = interactiveAudioUrl;
    } else {
      if (!firstNonInteractiveAudioUrl) {
        return;
      }
      audioEl.src = firstNonInteractiveAudioUrl;
    }

    audioEl.play().catch(() => null);
  }, [isInteractiveMode, interactiveAudioUrl, firstNonInteractiveAudioUrl]);

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

    console.log('[Polling] Starting to poll for branches...');

    const pollInterval = setInterval(async () => {
      try {
        const currentCheckpoint = sessionState.interactive_state?.current_segment.checkpoint_index ?? 0;
        const nextCheckpoint = currentCheckpoint + 1;

        console.log(`[Polling] Checking branches for checkpoint ${nextCheckpoint}...`);
        const branchesData = await api.getBranches(sessionState.session_id, nextCheckpoint);
        console.log('[Polling] Branches data:', branchesData);

        if (branchesData.branches_ready && branchesData.branches.length > 0) {
          // Branches are ready! Update the session state with them
          console.log('[Polling] ✅ Branches fetched and ready!', branchesData.branches);

          const nextOptions = branchesData.branches.slice(0, 2).map((br, i) => ({
            id: (br.id ?? (['A', 'B'] as const)[i]) as ChoiceId,
            label: br.label ?? ((['A', 'B'] as const)[i] === 'A' ? 'Choice A' : 'Choice B'),
            segment: {
              from_checkpoint: currentCheckpoint,
              to_checkpoint: nextCheckpoint,
              text: br.segment.text,
              emotion_hint: br.segment.emotion_hint ?? 'warm', // Default to 'warm' if not provided
              audio_url: br.segment.audio_url,
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

    // Cleanup
    return () => {
      clearInterval(pollInterval);
    };
  }, [sessionState]);

  const playAudio = (audioUrl: string) => {
    const audioEl = audioRef.current;
    if (!audioEl) {
      return;
    }

    audioEl.src = audioUrl;
    audioEl.play().catch(() => null);
  };

  const handleChoiceSelect = async (choiceId: ChoiceId) => {
    if (
      !sessionState ||
      !sessionState.settings.interactive ||
      !sessionState.interactive_state
    ) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { current_segment } = sessionState.interactive_state;

      const response = await api.continueStory({
        session_id: sessionState.session_id,
        from_checkpoint: current_segment.checkpoint_index,
        chosen: choiceId,
      });

      const nextSegment: CheckpointSegment = {
        checkpoint_index: response.ack.played_segment.to_checkpoint,
        text: response.ack.played_segment.text,
        emotion_hint: response.ack.played_segment.emotion_hint,
        audio_url: response.ack.played_segment.audio_url,
      };

      setSessionState((prev) => {
        if (!prev?.interactive_state) {
          return prev;
        }

        const previousRemaining = prev.interactive_state.remaining_checkpoints;
        const remaining =
          previousRemaining > 0 ? previousRemaining - 1 : 0;

        const history = [...prev.interactive_state.history, nextSegment];

        return {
          ...prev,
          interactive_state: {
            current_segment: nextSegment,
            next_options: response.reached_final ? [] : response.next_options,
            remaining_checkpoints: response.reached_final ? 0 : remaining,
            history,
          },
          reached_final: response.reached_final ? true : prev.reached_final,
          ending_reflection: response.reached_final
            ? response.ending.reflection
            : prev.ending_reflection,
        };
      });
    } catch (err: any) {
      setError(err.message || 'Failed to continue story. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartNewStory = () => {
    sessionStorage.removeItem(STORY_SESSION_STORAGE_KEY);
    setSessionState(null);
    navigate('/create');
  };

  const handleRetry = () => {
    setError(null);
  };

  if (error) {
    return <ErrorState message={error} onRetry={handleRetry} />;
  }

  if (!sessionState) {
    return <StoryLoadingState />;
  }

  const { child, settings } = sessionState;
  const isInteractive = settings.interactive;
  const interactiveState = sessionState.interactive_state;
  const nonInteractiveState = sessionState.non_interactive_state;

  const currentInteractiveSegment =
    interactiveState?.history[interactiveState.history.length - 1];
  const previousInteractiveSegments =
    interactiveState?.history.slice(0, -1) ?? [];

  return (
    <div className="container-bedtime min-h-screen">
      <audio ref={audioRef} />

      <div className="text-center mb-8 pt-8">
        <button
          onClick={() => navigate('/')}
          className="text-bedtime-purple/70 hover:text-bedtime-purple transition-colors text-lg mb-4 font-body"
        >
          ✨ TaleWeaver
        </button>
        <p className="text-bedtime-purple-dark font-body">
          A story for {child.name} • Ages {child.age_group}
        </p>
        {child.interests.length > 0 && (
          <p className="text-sm text-bedtime-purple/70 font-body mt-1">
            Interests: {child.interests.join(', ')}
          </p>
        )}
        {child.context && (
          <p className="text-sm text-bedtime-purple/60 font-body mt-1">
            Context: {child.context}
          </p>
        )}
        <p className="text-xs text-bedtime-purple/50 font-body mt-2 uppercase tracking-wide">
          {isInteractive ? 'Interactive adventure' : 'Classic story'} •{' '}
          {settings.duration_min} minute{settings.duration_min > 1 ? 's' : ''}
        </p>
      </div>

      {isInteractive && interactiveState && currentInteractiveSegment && (
        <>
          {previousInteractiveSegments.length > 0 && (
            <div className="space-y-4 mb-6">
              {previousInteractiveSegments.map((segment) => (
                <div key={segment.checkpoint_index} className="bedtime-card bg-white/70">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xl text-bedtime-purple font-display font-medium">
                      Checkpoint {segment.checkpoint_index}
                    </h4>
                    <span className="text-xs font-semibold px-3 py-1 rounded-full bg-bedtime-purple-pale text-bedtime-purple-dark uppercase tracking-wide">
                      {formatEmotion(segment.emotion_hint)}
                    </span>
                  </div>
                  <p className="text-bedtime-purple-dark font-body leading-relaxed whitespace-pre-wrap">
                    {segment.text}
                  </p>
                </div>
              ))}
            </div>
          )}

          <div className="bedtime-card mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl">📖</span>
                <h3 className="text-2xl text-bedtime-purple font-display font-medium">
                  Checkpoint {currentInteractiveSegment.checkpoint_index}
                </h3>
              </div>
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-bedtime-yellow/30 text-bedtime-yellow-dark uppercase tracking-wide">
                Emotion: {formatEmotion(currentInteractiveSegment.emotion_hint)}
              </span>
            </div>

            <p className="text-bedtime-purple-dark font-body text-lg leading-relaxed whitespace-pre-wrap mb-4">
              {currentInteractiveSegment.text}
            </p>

            <div className="flex items-center gap-4 p-4 bg-bedtime-purple-pale/30 rounded-xl">
              <button
                onClick={() => playAudio(currentInteractiveSegment.audio_url)}
                className="w-12 h-12 rounded-full bg-bedtime-yellow text-white flex items-center justify-center text-2xl hover:scale-110 transition-transform"
                aria-label="Play narration"
              >
                ▶
              </button>
              <div className="flex-1">
                <p className="text-sm text-bedtime-purple-dark font-medium mb-1">
                  Listen to this part
                </p>
                <p className="text-xs text-bedtime-purple/60">
                  Tap to hear the narrated version
                </p>
              </div>
              <div className="text-xs text-bedtime-purple/60 font-semibold uppercase tracking-wide">
                Remaining checkpoints:{' '}
                {interactiveState.remaining_checkpoints}
              </div>
            </div>
          </div>

          {sessionState.reached_final && sessionState.ending_reflection ? (
            <div className="bedtime-card text-center mb-6 animate-float">
              <div className="text-6xl mb-4">🌟</div>
              <h2 className="text-3xl text-bedtime-purple font-display font-medium mb-4">
                The End
              </h2>
              <p className="text-bedtime-purple-dark font-body mb-6 leading-relaxed">
                {sessionState.ending_reflection}
              </p>
            </div>
          ) : (
            <div className="bedtime-card mb-6">
              <h4 className="text-xl text-bedtime-purple font-display font-medium mb-4 flex items-center gap-2">
                <span>🤔</span>
                <span>What happens next?</span>
              </h4>

              <div className="space-y-3">
                {interactiveState.next_options.length > 0 ? (
                  interactiveState.next_options.map((option: ChoiceOption) => (
                    <button
                      key={option.id}
                      onClick={() => handleChoiceSelect(option.id)}
                      disabled={isLoading}
                      className="btn-choice disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-2xl flex-shrink-0">
                          {option.id === 'A' ? '🅰️' : '🅱️'}
                        </span>
                        <div className="text-left flex-1">
                          <p className="font-medium text-bedtime-purple-dark mb-1">
                            {option.label}
                          </p>
                          <p className="text-sm text-bedtime-purple/60">
                            Emotion hint: {formatEmotion(option.segment.emotion_hint)}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="text-center py-6">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-bedtime-purple border-t-transparent mb-3"></div>
                    <p className="text-bedtime-purple/70 text-sm">
                      Weaving your choices... ✨
                    </p>
                  </div>
                )}
                {isLoading && (
                  <p className="text-center text-bedtime-purple/70 text-sm">
                    Continuing the story...
                  </p>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {!isInteractive && nonInteractiveState && (
        <div className="space-y-6">
          {nonInteractiveState.segments.map((segment) => (
            <div key={segment.checkpoint_index} className="bedtime-card">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">📖</span>
                  <h3 className="text-2xl text-bedtime-purple font-display font-medium">
                    Part {segment.checkpoint_index}
                  </h3>
                </div>
                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-bedtime-purple-pale text-bedtime-purple-dark uppercase tracking-wide">
                  {formatEmotion(segment.emotion_hint)}
                </span>
              </div>
              <p className="text-bedtime-purple-dark font-body leading-relaxed whitespace-pre-wrap mb-4">
                {segment.text}
              </p>
              <button
                onClick={() => playAudio(segment.audio_url)}
                className="btn-secondary w-full"
              >
                Listen to narration
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 pb-8 text-center">
        <button onClick={handleStartNewStory} className="btn-secondary">
          Start New Story
        </button>
      </div>
    </div>
  );
};
