import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SongForm } from '../components/SongForm';
import { ErrorState } from '../components/LoadingStates';
import type { SongRequest } from '../lib/types';

export const CreateSong: React.FC = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (request: SongRequest) => {
    setError(null);
    // Navigate immediately to the player page with a pending flag.
    navigate('/play-song', { state: { pending: true, request } });
  };

  if (error) {
    return <ErrorState message={error} onRetry={() => setError(null)} />;
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
          Compose a personalized song that your child will love
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

      <SongForm onSubmit={handleSubmit} />

      <div className="text-center mt-12 pb-8">
        <p className="text-bedtime-purple/60 text-sm font-body">
          Crafted with rhythm, rhyme, and a sprinkling of AI magic 🎵
        </p>
      </div>
    </div>
  );
};
