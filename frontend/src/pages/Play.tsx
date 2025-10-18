import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SceneCard } from '../components/SceneCard';
import { StoryLoadingState, ErrorState } from '../components/LoadingStates';
import { Scene, Child } from '../lib/types';
import api from '../lib/api';

export const Play: React.FC = () => {
  const navigate = useNavigate();
  const [currentScene, setCurrentScene] = useState<Scene | null>(null);
  const [storyTitle, setStoryTitle] = useState<string>('');
  const [sessionId, setSessionId] = useState<string>('');
  const [childProfile, setChildProfile] = useState<Child | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);

  // Load initial scene from sessionStorage
  useEffect(() => {
    const storedSessionId = sessionStorage.getItem('sessionId');
    const storedTitle = sessionStorage.getItem('storyTitle');
    const storedScene = sessionStorage.getItem('currentScene');
    const storedChild = sessionStorage.getItem('childProfile');

    if (!storedSessionId || !storedTitle || !storedScene) {
      // No active story, redirect to create page
      navigate('/');
      return;
    }

    setSessionId(storedSessionId);
    setStoryTitle(storedTitle);
    setCurrentScene(JSON.parse(storedScene));

    if (storedChild) {
      setChildProfile(JSON.parse(storedChild));
    }
  }, [navigate]);

  const handleChoiceSelect = async (choiceIndex: number) => {
    if (!sessionId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await api.continueStory({
        session_id: sessionId,
        chosen_option: choiceIndex,
      });

      setCurrentScene(response.next_scene);
      sessionStorage.setItem('currentScene', JSON.stringify(response.next_scene));

      if (response.story_complete) {
        setIsComplete(true);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to continue story. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartNewStory = () => {
    // Clear session data
    sessionStorage.clear();
    navigate('/');
  };

  const handleRetry = () => {
    setError(null);
  };

  if (error) {
    return <ErrorState message={error} onRetry={handleRetry} />;
  }

  if (isLoading) {
    return <StoryLoadingState />;
  }

  if (!currentScene) {
    return <StoryLoadingState />;
  }

  return (
    <div className="container-bedtime stars-bg min-h-screen">
      {/* Moon decoration */}
      <div className="moon"></div>

      {/* Header */}
      <div className="text-center mb-8 pt-8">
        <button
          onClick={() => navigate('/')}
          className="text-bedtime-yellow/70 hover:text-bedtime-yellow transition-colors text-lg mb-4"
        >
          ✨ TaleWeaver
        </button>
        <h1 className="text-4xl mb-2 text-bedtime-yellow text-shadow-glow">
          {storyTitle}
        </h1>
        {childProfile && (
          <p className="text-bedtime-cream-warm">
            A story for {childProfile.name}, age {childProfile.age}
          </p>
        )}
      </div>

      {/* Story completion message */}
      {isComplete && (
        <div className="bedtime-card text-center mb-6 animate-float">
          <div className="text-6xl mb-4">🌟</div>
          <h2 className="text-3xl text-bedtime-yellow mb-4">
            The End
          </h2>
          <p className="text-bedtime-cream-warm mb-6">
            Sweet dreams, {childProfile?.name}!
            You learned so much on this adventure.
          </p>
          <button onClick={handleStartNewStory} className="btn-primary">
            Create Another Story
          </button>
        </div>
      )}

      {/* Current scene */}
      {!isComplete && (
        <SceneCard
          scene={currentScene}
          onChoiceSelect={handleChoiceSelect}
          isLoading={isLoading}
        />
      )}

      {/* Navigation */}
      <div className="mt-8 pb-8 text-center">
        <button
          onClick={handleStartNewStory}
          className="btn-secondary"
        >
          Start New Story
        </button>
      </div>
    </div>
  );
};
