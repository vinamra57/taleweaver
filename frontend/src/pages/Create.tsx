import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { StoryForm } from '../components/StoryForm';
import { StoryLoadingState, ErrorState } from '../components/LoadingStates';
import { StartRequest, StoredStorySession } from '../lib/types';
import { STORY_SESSION_STORAGE_KEY } from '../lib/constants';
import api from '../lib/api';

export const Create: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [presetKey, setPresetKey] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<any>(null);

  useEffect(() => {
    setPresetKey(searchParams.get('preset'));
    // Check if profile data was passed from Profiles page
    if (location.state?.profile) {
      setProfileData(location.state.profile);
    }
  }, [searchParams, location]);

  const handleSubmit = async (request: StartRequest) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.startStory(request);
      const sessionToStore: StoredStorySession = {
        session_id: response.session_id,
        child: request.child,
        settings: response.settings,
      };

      if ('current_segment' in response) {
        sessionToStore.interactive_state = {
          current_segment: response.current_segment,
          next_options: response.next_options,
          remaining_checkpoints: response.remaining_checkpoints,
          history: [{
            segment: response.current_segment,
            chosenOption: undefined, // First segment has no choice
          }],
        };
      } else {
        sessionToStore.non_interactive_state = {
          segments: response.segments,
        };
      }

      sessionStorage.setItem(
        STORY_SESSION_STORAGE_KEY,
        JSON.stringify(sessionToStore),
      );

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
      <StoryForm onSubmit={handleSubmit} isLoading={isLoading} presetKey={presetKey} profileData={profileData} />

      {/* Footer */}
      <div className="text-center mt-12 pb-8">
        <p className="text-bedtime-purple/60 text-sm font-body">
          Powered by AI magic and imagination ✨
        </p>
      </div>
    </div>
  );
};
