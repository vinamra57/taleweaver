import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SongForm } from '../components/SongForm';
import { SongRequest, StoredSongSession } from '../lib/types';
import { SONG_SESSION_STORAGE_KEY } from '../lib/constants';
import api from '../lib/api';

export const SongCreate: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (request: SongRequest) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.createSong(request);

      const sessionToStore: StoredSongSession = {
        session_id: response.session_id,
        child_name: request.child_name,
        audio_url: response.audio_url,
        title: response.title,
        lyrics: response.lyrics,
        duration_seconds: response.duration_seconds,
        song_type: request.song_type,
        theme: request.theme,
        moral_focus: request.moral_focus,
        musical_style: request.musical_style,
        voice_selection: request.voice_selection,
        created_at: new Date().toISOString(),
      };

      sessionStorage.setItem(
        SONG_SESSION_STORAGE_KEY,
        JSON.stringify(sessionToStore),
      );

      navigate('/play-song');
    } catch (err: any) {
      setError(err.message || 'Failed to create song. Please try again.');
      setIsLoading(false);
    }
  };

  if (error) {
    return (
      <div className="container-bedtime min-h-screen flex flex-col items-center justify-center gap-6 text-center">
        <div className="text-6xl">😔</div>
        <h2 className="text-3xl font-display text-bedtime-purple">Oops!</h2>
        <p className="text-bedtime-purple-dark font-body">{error}</p>
        <button onClick={() => setError(null)} className="btn-primary">Try Again</button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container-bedtime min-h-screen flex flex-col items-center justify-center gap-6 text-center">
        <div className="text-6xl">🎵</div>
        <h2 className="text-3xl font-display text-bedtime-purple">Composing your magical song...</h2>
        <div className="spinner" />
      </div>
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
      <SongForm onSubmit={handleSubmit} isLoading={isLoading} />

      {/* Footer */}
      <div className="text-center mt-12 pb-8">
        <p className="text-bedtime-purple/60 text-sm font-body">
          Powered by AI magic and imagination ✨
        </p>
      </div>
    </div>
  );
};
