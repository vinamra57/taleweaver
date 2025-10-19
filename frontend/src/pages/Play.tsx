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
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPlayingUrl, setCurrentPlayingUrl] = useState<string | null>(null);

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
          parsed.interactive_state.history = [{
            segment: parsed.interactive_state.current_segment,
            chosenOption: undefined, // First segment has no choice
          }];
        } else if (parsed.interactive_state.history[0].segment === undefined) {
          // Migrate old format (CheckpointSegment[]) to new format (HistoryEntry[])
          parsed.interactive_state.history = parsed.interactive_state.history.map((item: any) => ({
            segment: item.checkpoint_index !== undefined ? item : item.segment,
            chosenOption: item.chosenOption,
          }));
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

  // Add event listeners to audio element
  useEffect(() => {
    const audioEl = audioRef.current;
    if (!audioEl) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentPlayingUrl(null);
    };

    audioEl.addEventListener('play', handlePlay);
    audioEl.addEventListener('pause', handlePause);
    audioEl.addEventListener('ended', handleEnded);

    return () => {
      audioEl.removeEventListener('play', handlePlay);
      audioEl.removeEventListener('pause', handlePause);
      audioEl.removeEventListener('ended', handleEnded);
    };
  }, []);

  const playAudio = (audioUrl: string) => {
    const audioEl = audioRef.current;
    if (!audioEl) {
      return;
    }

    // Only set src if it's a different audio file
    if (audioEl.src !== audioUrl) {
      audioEl.src = audioUrl;
      setCurrentPlayingUrl(audioUrl);
    }

    audioEl.play().catch(() => null);
  };

  const pauseAudio = () => {
    const audioEl = audioRef.current;
    if (!audioEl) {
      return;
    }
    audioEl.pause();
  };

  const toggleAudio = (audioUrl: string) => {
    if (currentPlayingUrl === audioUrl && isPlaying) {
      pauseAudio();
    } else {
      playAudio(audioUrl);
    }
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
      const { current_segment, next_options } = sessionState.interactive_state;

      // Find the chosen option to save its text
      const chosenOption = next_options.find(opt => opt.id === choiceId);

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

        const history = [
          ...prev.interactive_state.history,
          {
            segment: nextSegment,
            chosenOption: chosenOption?.label, // Save the choice text
          },
        ];

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

  const currentInteractiveEntry =
    interactiveState?.history[interactiveState.history.length - 1];
  const previousInteractiveEntries =
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

      {isInteractive && interactiveState && currentInteractiveEntry && (
        <>
          {previousInteractiveEntries.length > 0 && (
            <div className="space-y-4 mb-6">
              {previousInteractiveEntries.map((entry) => (
                <div key={entry.segment.checkpoint_index} className="bedtime-card bg-white/70">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xl text-bedtime-purple font-display font-medium">
                      Checkpoint {entry.segment.checkpoint_index}
                    </h4>
                    <button
                      onClick={() => toggleAudio(entry.segment.audio_url)}
                      className="w-10 h-10 rounded-full bg-bedtime-purple/10 hover:bg-bedtime-purple/20 text-bedtime-purple flex items-center justify-center text-lg transition-all"
                      aria-label={currentPlayingUrl === entry.segment.audio_url && isPlaying ? "Pause" : "Replay"}
                    >
                      {currentPlayingUrl === entry.segment.audio_url && isPlaying ? '⏸' : '▶'}
                    </button>
                  </div>
                  {entry.chosenOption && (
                    <div className="mb-3 p-3 bg-bedtime-yellow/10 rounded-lg border-l-4 border-bedtime-yellow">
                      <p className="text-sm text-bedtime-purple/70 font-medium">
                        <span className="text-bedtime-yellow-dark">You chose:</span> {entry.chosenOption}
                      </p>
                    </div>
                  )}
                  <p className="text-bedtime-purple-dark font-body leading-relaxed whitespace-pre-wrap">
                    {entry.segment.text}
                  </p>
                </div>
              ))}
            </div>
          )}

          <div className="bedtime-card mb-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">📖</span>
              <h3 className="text-2xl text-bedtime-purple font-display font-medium">
                Checkpoint {currentInteractiveEntry.segment.checkpoint_index}
              </h3>
            </div>

            {currentInteractiveEntry.chosenOption && (
              <div className="mb-4 p-3 bg-bedtime-yellow/10 rounded-lg border-l-4 border-bedtime-yellow">
                <p className="text-sm text-bedtime-purple/70 font-medium">
                  <span className="text-bedtime-yellow-dark">You chose:</span> {currentInteractiveEntry.chosenOption}
                </p>
              </div>
            )}

            <p className="text-bedtime-purple-dark font-body text-lg leading-relaxed whitespace-pre-wrap mb-4">
              {currentInteractiveEntry.segment.text}
            </p>

            <div className="flex items-center gap-4 p-4 bg-bedtime-purple-pale/30 rounded-xl">
              <div className="flex gap-2">
                <button
                  onClick={() => playAudio(currentInteractiveEntry.segment.audio_url)}
                  disabled={currentPlayingUrl === currentInteractiveEntry.segment.audio_url && isPlaying}
                  className="w-12 h-12 rounded-full bg-bedtime-yellow text-white flex items-center justify-center text-2xl hover:scale-110 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Play narration"
                >
                  ▶
                </button>
                <button
                  onClick={pauseAudio}
                  disabled={!(currentPlayingUrl === currentInteractiveEntry.segment.audio_url && isPlaying)}
                  className="w-12 h-12 rounded-full bg-bedtime-purple text-white flex items-center justify-center text-2xl hover:scale-110 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Pause narration"
                >
                  ⏸
                </button>
              </div>
              <div className="flex-1">
                <p className="text-sm text-bedtime-purple-dark font-medium mb-1">
                  Listen to this part
                </p>
                <p className="text-xs text-bedtime-purple/60">
                  {currentPlayingUrl === currentInteractiveEntry.segment.audio_url && isPlaying
                    ? 'Playing...'
                    : 'Tap to hear the narrated version'}
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
              </div>
              <p className="text-bedtime-purple-dark font-body leading-relaxed whitespace-pre-wrap mb-4">
                {segment.text}
              </p>
              <button
                onClick={() => toggleAudio(segment.audio_url)}
                className="btn-secondary w-full flex items-center justify-center gap-2"
              >
                <span className="text-lg">
                  {currentPlayingUrl === segment.audio_url && isPlaying ? '⏸' : '▶'}
                </span>
                <span>
                  {currentPlayingUrl === segment.audio_url && isPlaying
                    ? 'Pause narration'
                    : 'Listen to narration'}
                </span>
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
