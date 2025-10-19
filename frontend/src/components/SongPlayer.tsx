import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StoredSongSession } from '../lib/types';

interface SongPlayerProps {
  session: StoredSongSession;
}

export const SongPlayer: React.FC<SongPlayerProps> = ({ session }) => {
  const navigate = useNavigate();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleEnded = () => {
      setIsPlaying(false);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;

    const newTime = parseFloat(e.target.value);
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getSongTypeLabel = () => {
    return session.song_type === 'song' ? '🎵 Song' : '🎶 Rhyme';
  };

  const getThemeIcon = () => {
    const themeIcons: Record<string, string> = {
      friendship: '🤝',
      adventure: '🗺️',
      learning: '📚',
      bedtime: '🌙',
      animals: '🦁',
      nature: '🌳',
      family: '👨‍👩‍👧',
      celebration: '🎉',
    };
    return themeIcons[session.theme] || '✨';
  };

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
          {session.child.name}'s {session.song_type === 'song' ? 'Song' : 'Rhyme'}
        </p>
      </div>

      {/* Song Player Card */}
      <div className="max-w-3xl mx-auto">
        <div className="bedtime-card mb-6">
          {/* Song Info */}
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">{getThemeIcon()}</div>
            <h2 className="text-3xl font-display font-semibold text-bedtime-purple mb-2">
              {session.child.name}'s {session.song_type === 'song' ? 'Song' : 'Rhyme'}
            </h2>
            <div className="flex gap-3 justify-center flex-wrap">
              <span className="px-4 py-2 rounded-full text-sm font-semibold bg-bedtime-purple-pale text-bedtime-purple">
                {getSongTypeLabel()}
              </span>
              <span className="px-4 py-2 rounded-full text-sm font-semibold bg-bedtime-yellow/20 text-bedtime-purple">
                {getThemeIcon()} {session.theme.charAt(0).toUpperCase() + session.theme.slice(1)}
              </span>
              {session.moral_focus && (
                <span className="px-4 py-2 rounded-full text-sm font-semibold bg-bedtime-green-soft/20 text-bedtime-purple">
                  {session.moral_focus.charAt(0).toUpperCase() + session.moral_focus.slice(1)}
                </span>
              )}
            </div>
          </div>

          {/* Audio Player */}
          <div className="bg-bedtime-purple-pale/30 rounded-2xl p-8 mb-6">
            <audio ref={audioRef} src={session.audio_url} preload="metadata" />

            {/* Play/Pause Button */}
            <div className="flex justify-center mb-6">
              <button
                onClick={togglePlayPause}
                className="w-20 h-20 rounded-full bg-bedtime-yellow text-white hover:bg-bedtime-purple transition-all shadow-lg hover:shadow-xl flex items-center justify-center text-4xl"
              >
                {isPlaying ? '⏸' : '▶️'}
              </button>
            </div>

            {/* Progress Bar */}
            <div className="mb-4">
              <input
                type="range"
                min="0"
                max={duration || 0}
                value={currentTime}
                onChange={handleSeek}
                className="w-full h-2 bg-white rounded-lg appearance-none cursor-pointer accent-bedtime-yellow"
              />
            </div>

            {/* Time Display */}
            <div className="flex justify-between text-sm text-bedtime-purple font-body">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Lyrics */}
          {session.lyrics_text && (
            <div className="bg-white/50 rounded-2xl p-6">
              <h3 className="text-xl font-display font-semibold text-bedtime-purple mb-4 text-center">
                Lyrics
              </h3>
              <div className="text-bedtime-purple-dark font-body text-lg leading-relaxed whitespace-pre-line text-center">
                {session.lyrics_text}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-center mb-8">
          <button
            onClick={() => {
              sessionStorage.clear();
              navigate('/');
            }}
            className="btn-secondary"
          >
            ← Back to Home
          </button>
          <button
            onClick={() => {
              sessionStorage.clear();
              navigate('/create-song');
            }}
            className="btn-primary"
          >
            Create Another Song
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center pb-12">
        <p className="text-bedtime-purple/60 font-body mb-4">
          Powered by AI magic and imagination ✨
        </p>
      </div>
    </div>
  );
};
