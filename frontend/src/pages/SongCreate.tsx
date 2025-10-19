import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { SongForm } from '../components/SongForm';
import { StoryLoadingState, ErrorState } from '../components/LoadingStates';
import { StartSongRequest, StoredSongSession } from '../lib/types';
import { SONG_SESSION_STORAGE_KEY } from '../lib/constants';
import api from '../lib/api';

export const SongCreate: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<any>(null);

  useEffect(() => {
    // Check if profile data was passed from Profiles page
    if (location.state?.profile) {
      setProfileData(location.state.profile);
    }
  }, [location]);

  const handleSubmit = async (request: StartSongRequest) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.startSong(request);

      const sessionToStore: StoredSongSession = {
        session_id: response.session_id,
        child: request.child,
        song_type: request.song_type,
        theme: request.theme,
        moral_focus: request.moral_focus,
        song_length: request.song_length,
        audio_url: response.audio_url,
        lyrics_text: response.lyrics_text,
      };

      sessionStorage.setItem(
        SONG_SESSION_STORAGE_KEY,
        JSON.stringify(sessionToStore),
      );

      navigate('/play');
    } catch (err: any) {
      setError(err.message || 'Failed to create song. Please try again.');
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
    return (
      <StoryLoadingState
        messages={[
          'Composing your magical song...',
          'Gathering musical notes...',
          'Adding melody and rhythm...',
          'Creating beautiful lyrics...',
          'Sprinkling song magic...',
        ]}
      />
    );
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
          Create a magical song or rhyme just for you
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

      {/* Song form */}
      <SongForm onSubmit={handleSubmit} isLoading={isLoading} profileData={profileData} />

      {/* Footer */}
      <div className="text-center mt-12 pb-8">
        <p className="text-bedtime-purple/60 text-sm font-body">
          Powered by AI magic and imagination ✨
        </p>
      </div>
    </div>
  );
};
