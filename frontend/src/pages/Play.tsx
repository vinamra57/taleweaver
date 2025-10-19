import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { StoryLoadingState, ErrorState } from '../components/LoadingStates';
import {
  ChoiceId,
  ChoiceOption,
  CheckpointSegment,
  StoredStorySession,
} from '../lib/types';
import { STORY_SESSION_STORAGE_KEY } from '../lib/constants';
import api from '../lib/api';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787';

// Backend Session type (simplified - only fields we need for conversion)
type BackendSession = {
  session_id: string;
  child: {
    name: string;
    gender: 'male' | 'female';
    age_range: '4-6' | '7-9' | '10-12';
    interests: string; // comma-separated
    context?: string;
  };
  story_length: 1 | 2 | 3;
  interactive: boolean;
  moral_focus: string;
  total_checkpoints: number;
  current_checkpoint: number;
  chosen_path: ('A' | 'B')[]; // History of choices
  segments: {
    id: string;
    text: string;
    audio_url: string;
    checkpoint_number: number;
    choice_text?: string;
  }[];
  evaluation_summary?: string;
};

// Convert backend Session to frontend StoredStorySession
function convertBackendSessionToFrontend(backendSession: BackendSession): StoredStorySession {
  const child = {
    name: backendSession.child.name,
    gender: backendSession.child.gender,
    age_group: backendSession.child.age_range, // age_range → age_group
    interests: backendSession.child.interests.split(',').map(i => i.trim()), // string → array
    context: backendSession.child.context,
  };

  const settings = {
    duration_min: backendSession.story_length,
    interactive: backendSession.interactive,
    age_group: backendSession.child.age_range,
  };

  const reached_final = backendSession.interactive
    ? backendSession.current_checkpoint >= backendSession.total_checkpoints
    : true;

  if (backendSession.interactive) {
    // Build interactive state from segments
    // Find current segment based on chosen_path
    const currentCheckpoint = backendSession.current_checkpoint;

    // Find the current segment
    const currentSegment = backendSession.segments.find(
      seg => seg.checkpoint_number === currentCheckpoint
    );

    if (!currentSegment) {
      throw new Error(`Current segment not found for checkpoint ${currentCheckpoint}`);
    }

    // Build history from chosen_path and segments
    const history = backendSession.segments
      .filter(seg => seg.checkpoint_number <= currentCheckpoint)
      .filter(seg => {
        // Include checkpoint 0 (start)
        if (seg.checkpoint_number === 0) return true;
        // Include segments that match the chosen path
        const pathIndex = seg.checkpoint_number - 1;
        if (pathIndex >= backendSession.chosen_path.length) return false;
        const chosenBranch = backendSession.chosen_path[pathIndex];
        // Segment ID format: "segment_1a", "segment_2b", etc.
        return seg.id.toLowerCase().endsWith(chosenBranch.toLowerCase());
      })
      .sort((a, b) => a.checkpoint_number - b.checkpoint_number)
      .map(seg => ({
        segment: {
          checkpoint_index: seg.checkpoint_number,
          text: seg.text,
          emotion_hint: 'warm' as const, // Default emotion
          audio_url: seg.audio_url,
        },
        chosenOption: seg.choice_text,
      }));

    // Find next options if not at final checkpoint
    const next_options: ChoiceOption[] = [];
    if (!reached_final) {
      const nextCheckpoint = currentCheckpoint + 1;
      const nextSegments = backendSession.segments.filter(
        seg => seg.checkpoint_number === nextCheckpoint
      );

      for (const seg of nextSegments) {
        const branchId = seg.id.slice(-1).toUpperCase() as 'A' | 'B';
        next_options.push({
          id: branchId,
          label: seg.choice_text || `Choice ${branchId}`,
          segment: {
            from_checkpoint: currentCheckpoint,
            to_checkpoint: nextCheckpoint,
            text: seg.text,
            emotion_hint: 'warm' as const,
            audio_url: seg.audio_url,
          },
        });
      }
    }

    return {
      session_id: backendSession.session_id,
      child,
      settings: { ...settings, interactive: true },
      interactive_state: {
        current_segment: {
          checkpoint_index: currentSegment.checkpoint_number,
          text: currentSegment.text,
          emotion_hint: 'warm' as const,
          audio_url: currentSegment.audio_url,
        },
        next_options,
        remaining_checkpoints: backendSession.total_checkpoints - currentCheckpoint,
        history,
      },
      reached_final,
      ending_reflection: reached_final ? 'The end — nice choices! Sleep tight 🌙' : undefined,
      evaluation_summary: backendSession.evaluation_summary,
    };
  } else {
    // Non-interactive: single segment
    return {
      session_id: backendSession.session_id,
      child,
      settings: { ...settings, interactive: false },
      non_interactive_state: {
        segments: backendSession.segments.map(seg => ({
          checkpoint_index: seg.checkpoint_number,
          text: seg.text,
          emotion_hint: 'warm' as const,
          audio_url: seg.audio_url,
        })),
      },
      reached_final: true,
      evaluation_summary: backendSession.evaluation_summary,
    };
  }
}

export const Play: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, accessToken } = useAuth();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [sessionState, setSessionState] = useState<StoredStorySession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPlayingUrl, setCurrentPlayingUrl] = useState<string | null>(null);
  const [isLoadingEvaluation, setIsLoadingEvaluation] = useState(false);

  // Load story from saved story or session storage
  useEffect(() => {
    const loadStory = async () => {
      // Check if we're loading a saved story
      const searchParams = new URLSearchParams(window.location.search);
      const storyId = searchParams.get('storyId');

      if (storyId) {
        // Load saved story from backend
        try {
          setIsLoading(true);
          const { session } = await api.getStory(storyId);

          // Convert backend session to frontend format
          const frontendSession = convertBackendSessionToFrontend(session);

          // Save to sessionStorage
          sessionStorage.setItem(STORY_SESSION_STORAGE_KEY, JSON.stringify(frontendSession));
          setSessionState(frontendSession);

          // Mark as already saved since we loaded it from backend
          setIsSaved(true);
        } catch (err: any) {
          console.error('Failed to load saved story', err);
          setError(err.message || 'Failed to load story');
        } finally {
          setIsLoading(false);
        }
        return;
      }

      // Load from sessionStorage (current story)
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
    };

    loadStory();
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

          const nextOptions = branchesData.branches.slice(0, 2).map((br) => ({
            id: br.choice_value,
            label: br.choice_text,
            segment: {
              from_checkpoint: currentCheckpoint,
              to_checkpoint: nextCheckpoint,
              text: br.segment.text,
              emotion_hint: br.segment.emotion_hint ?? 'warm',
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
    if (currentPlayingUrl !== audioUrl) {
      audioEl.src = audioUrl;
    }
    setCurrentPlayingUrl(audioUrl);

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

  const handleGetEvaluation = async () => {
    if (!sessionState) return;

    setIsLoadingEvaluation(true);
    try {
      const response = await api.getEvaluation(sessionState.session_id);

      // Save evaluation to session state
      setSessionState(prev => {
        if (!prev) return prev;
        const updated = {
          ...prev,
          evaluation_summary: response.evaluation.summary,
        };
        // Persist to sessionStorage
        sessionStorage.setItem(STORY_SESSION_STORAGE_KEY, JSON.stringify(updated));
        return updated;
      });
    } catch (err: any) {
      alert(err.message || 'Failed to get evaluation');
    } finally {
      setIsLoadingEvaluation(false);
    }
  };

  const handleStartNewStory = () => {
    sessionStorage.removeItem(STORY_SESSION_STORAGE_KEY);
    setSessionState(null);
    navigate('/create');
  };

  const handleSaveStory = async () => {
    if (!sessionState || !isAuthenticated) {
      return;
    }

    // Prompt user for a title
    const title = prompt('Enter a title for this story:');
    if (!title || title.trim() === '') {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/stories/save`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: sessionState.session_id,
          title: title.trim(),
        }),
      });

      if (response.ok) {
        setIsSaved(true);
        alert('Story saved successfully!');
      } else {
        const errorData = await response.json();
        alert('Failed to save story: ' + (errorData.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Failed to save story', error);
      alert('Failed to save story');
    }
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

      {/* Navigation buttons */}
      <div className="pt-4 flex justify-end gap-4">
        <button
          onClick={() => navigate('/')}
          className="btn-secondary"
        >
          Home
        </button>
        <button
          onClick={() => navigate('/dashboard')}
          className="btn-secondary"
        >
          Dashboard
        </button>
      </div>

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
                  disabled={isPlaying && currentPlayingUrl === currentInteractiveEntry.segment.audio_url}
                  className="w-12 h-12 rounded-full bg-bedtime-yellow text-white flex items-center justify-center text-2xl hover:scale-110 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Play narration"
                >
                  ▶
                </button>
                <button
                  onClick={pauseAudio}
                  disabled={!isPlaying || currentPlayingUrl !== currentInteractiveEntry.segment.audio_url}
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

              {/* Evaluation Section */}
              {sessionState.evaluation_summary ? (
                <div className="mb-6">
                  <h3 className="text-lg font-display font-medium text-bedtime-purple mb-2">
                    {sessionState.child.name}'s Story Reflection
                  </h3>
                  <p className="text-bedtime-purple-dark font-body leading-relaxed p-4 bg-bedtime-yellow/10 rounded-lg">
                    {sessionState.evaluation_summary}
                  </p>
                </div>
              ) : (
                <button
                  onClick={handleGetEvaluation}
                  disabled={isLoadingEvaluation}
                  className="btn-primary mb-4 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoadingEvaluation ? 'Creating Reflection...' : 'Get Story Reflection'}
                </button>
              )}
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
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          {isAuthenticated && !isSaved && (
            <button onClick={handleSaveStory} className="btn-primary">
              Save This Story
            </button>
          )}
          {isSaved && (
            <p className="text-bedtime-purple font-body">Story saved!</p>
          )}
          <button onClick={handleStartNewStory} className="btn-secondary">
            Start New Story
          </button>
        </div>
        {!isAuthenticated && (
          <p className="text-bedtime-purple/60 text-sm mt-4">
            <button
              onClick={() => navigate('/login')}
              className="text-bedtime-purple hover:underline"
            >
              Sign in
            </button>
            {' '}to save your stories
          </p>
        )}
      </div>
    </div>
  );
};