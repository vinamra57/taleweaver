import { useState } from 'react';

interface AudioPlayerProps {
  audioPrompt?: string;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ audioPrompt }) => {
  const [isPlaying, setIsPlaying] = useState(false);

  // Placeholder for future audio implementation
  const handleTogglePlay = () => {
    setIsPlaying(!isPlaying);
    // TODO: Implement actual audio playback when audio generation is available
    console.log('Audio prompt:', audioPrompt);
  };

  if (!audioPrompt) return null;

  return (
    <div className="bedtime-card">
      <div className="flex items-center gap-4">
        <button
          onClick={handleTogglePlay}
          className="w-12 h-12 rounded-full bg-bedtime-yellow text-bedtime-purple-dark flex items-center justify-center text-2xl hover:scale-110 transition-transform"
          aria-label={isPlaying ? 'Pause audio' : 'Play audio'}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>

        <div className="flex-1">
          <p className="text-sm text-bedtime-cream/70 mb-1">Story Narration</p>
          <div className="h-2 bg-bedtime-blue-midnight rounded-full overflow-hidden">
            <div
              className="h-full bg-bedtime-yellow transition-all duration-300"
              style={{ width: isPlaying ? '60%' : '0%' }}
            />
          </div>
        </div>

        <span className="text-bedtime-yellow text-2xl animate-pulse">
          {isPlaying ? '🔊' : '🔇'}
        </span>
      </div>

      <p className="text-xs text-bedtime-cream/50 mt-2 italic">
        Audio coming soon!
      </p>
    </div>
  );
};
