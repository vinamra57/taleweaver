import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { StoryForm } from '../components/StoryForm';
import { StoryLoadingState, ErrorState } from '../components/LoadingStates';
import { Child } from '../lib/types';
import api from '../lib/api';

export const Create: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [presetKey, setPresetKey] = useState<string | null>(null);

  useEffect(() => {
    const preset = searchParams.get('preset');
    if (preset) {
      setPresetKey(preset);
    }
  }, [searchParams]);

  const handleSubmit = async (child: Child) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.startStory({ child });

      // Store session data in sessionStorage
      sessionStorage.setItem('sessionId', response.session_id);
      sessionStorage.setItem('storyTitle', response.story_title);
      sessionStorage.setItem('currentScene', JSON.stringify(response.initial_scene));
      sessionStorage.setItem('childProfile', JSON.stringify(child));

      // Navigate to play page
      navigate('/play');
    } catch (err: any) {
      setError(err.message || 'Failed to create story. Please try again.');
      setIsLoading(false);
    }
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

  return (
    <div className="container-bedtime min-h-screen">
      {/* Header */}
      <div className="text-center mb-8 pt-8">
        <button
          onClick={() => navigate('/')}
          className="text-5xl mb-4 text-bedtime-purple font-display font-bold hover:scale-105 transition-transform cursor-pointer inline-block"
        >
          TaleWeaver
        </button>
        <p className="text-xl text-bedtime-purple-dark font-body">
          Create a magical bedtime story tailored just for you
        </p>
      </div>

      {/* Back button */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/')}
          className="text-bedtime-purple hover:text-bedtime-purple-dark transition-colors flex items-center gap-2 font-body"
        >
          <span>←</span>
          <span>Back to Home</span>
        </button>
      </div>

      {/* Story form */}
      <StoryForm onSubmit={handleSubmit} isLoading={isLoading} presetKey={presetKey} />

      {/* Footer */}
      <div className="text-center mt-12 pb-8">
        <p className="text-bedtime-purple/60 text-sm font-body">
          Powered by AI magic and imagination ✨
        </p>
      </div>
    </div>
  );
};
