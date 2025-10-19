/**
 * Book Components - Storybook-style UI with page flip animations
 * Contains BookContainer, LeftPage (image), and RightPage (text/audio/choices)
 */

import React, { useState, useRef, useEffect } from 'react';

// ============================================================================
// Types
// ============================================================================

interface BookContainerProps {
  children: React.ReactNode;
  isFlipping: boolean;
}

interface LeftPageProps {
  imageUrl: string;
  pageNumber: number;
  isLoading?: boolean;
}

interface RightPageProps {
  checkpointNumber: number;
  text: string;
  audioUrl: string;
  choices?: Array<{
    id: 'A' | 'B';
    label: string;
  }>;
  onChoiceClick?: (choiceId: 'A' | 'B') => void;
  pageNumber: number;
  isLoading?: boolean;
  showChoices?: boolean;
}

// ============================================================================
// BookContainer Component
// ============================================================================

export const BookContainer: React.FC<BookContainerProps> = ({ children, isFlipping }) => {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 md:p-8">
      <div className={`
        w-full max-w-6xl transition-all duration-300
        ${isFlipping ? 'scale-[0.98]' : 'scale-100'}
      `}>
        {children}
      </div>
    </div>
  );
};

// ============================================================================
// LeftPage Component (Image Display)
// ============================================================================

export const LeftPage: React.FC<LeftPageProps> = ({
  imageUrl,
  pageNumber,
  isLoading = false
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    setImageLoaded(false);
  }, [imageUrl]);

  return (
    <div className="
      bg-gradient-to-br from-bedtime-cream to-bedtime-cream-warm
      rounded-l-3xl md:rounded-l-[2rem]
      p-6 md:p-8
      shadow-2xl
      flex flex-col
      border-r-2 border-bedtime-purple-pale/30
      relative
      overflow-hidden
    ">
      {/* Page corner decoration */}
      <div className="absolute top-0 right-0 w-16 h-16 bg-bedtime-yellow-soft opacity-20
                      transform rotate-45 translate-x-8 -translate-y-8" />

      {/* Image Frame */}
      <div className="flex-1 flex items-center justify-center">
        {isLoading ? (
          // Loading skeleton
          <div className="w-full aspect-[4/3] bg-bedtime-purple-pale/10 rounded-2xl
                         animate-pulse flex items-center justify-center">
            <div className="text-center">
              <div className="spinner mb-4" />
              <p className="text-bedtime-purple/60 text-sm">Illustrating...</p>
            </div>
          </div>
        ) : (
          // Actual image (imageUrl is always present now)
          <div className="w-full aspect-[4/3] relative">
            {!imageLoaded && (
              <div className="absolute inset-0 bg-bedtime-purple-pale/10 rounded-2xl animate-pulse" />
            )}
            <img
              src={imageUrl}
              alt="Story illustration"
              className={`
                w-full h-full object-cover rounded-2xl
                shadow-lg border-4 border-white
                transition-opacity duration-500
                ${imageLoaded ? 'opacity-100' : 'opacity-0'}
              `}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageLoaded(true)} // Show even if error
            />
            {/* Watercolor border effect */}
            <div className="absolute inset-0 rounded-2xl border-2 border-bedtime-yellow/20 pointer-events-none" />
          </div>
        )}
      </div>

      {/* Page number */}
      <div className="mt-6 text-center">
        <span className="text-bedtime-purple/40 text-sm font-medium">
          {pageNumber}
        </span>
      </div>
    </div>
  );
};

// ============================================================================
// RightPage Component (Text, Audio, Choices)
// ============================================================================

export const RightPage: React.FC<RightPageProps> = ({
  checkpointNumber,
  text,
  audioUrl,
  choices = [],
  onChoiceClick,
  pageNumber,
  isLoading = false,
  showChoices = true,
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Auto-play audio when segment changes
  useEffect(() => {
    const audioEl = audioRef.current;
    if (audioEl && audioUrl) {
      audioEl.src = audioUrl;
      audioEl.play().catch(() => null);
      setIsPlaying(true);
    }
  }, [audioUrl]);

  const handlePlayAudio = () => {
    const audioEl = audioRef.current;
    if (audioEl) {
      if (isPlaying) {
        audioEl.pause();
        setIsPlaying(false);
      } else {
        audioEl.play().catch(() => null);
        setIsPlaying(true);
      }
    }
  };

  return (
    <div className="
      bg-gradient-to-br from-bedtime-cream-warm to-bedtime-cream
      rounded-r-3xl md:rounded-r-[2rem]
      p-6 md:p-8
      shadow-2xl
      flex flex-col
      relative
      overflow-hidden
    ">
      {/* Page texture overlay */}
      <div className="absolute inset-0 opacity-5 pointer-events-none"
           style={{
             backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100' height='100' filter='url(%23noise)' opacity='0.05'/%3E%3C/svg%3E")`
           }} />

      {/* Checkpoint header */}
      <div className="mb-4 flex items-center gap-2">
        <span className="text-2xl">📖</span>
        <h3 className="text-xl font-display font-medium text-bedtime-purple">
          Checkpoint {checkpointNumber}
        </h3>
      </div>

      {/* Story text */}
      <div className="flex-1 overflow-y-auto mb-6 pr-2">
        <p className="text-lg leading-relaxed text-bedtime-purple-dark whitespace-pre-wrap font-body">
          {text}
        </p>
      </div>

      {/* Audio player */}
      <audio
        ref={audioRef}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
      />

      <div className="mb-6">
        <button
          onClick={handlePlayAudio}
          className="
            w-full bg-bedtime-yellow/10 hover:bg-bedtime-yellow/20
            border-2 border-bedtime-yellow
            rounded-2xl p-4
            flex items-center justify-center gap-3
            transition-all duration-200
            hover:shadow-lg hover:scale-[1.02]
            active:scale-95
          "
        >
          <span className="text-3xl">
            {isPlaying ? '⏸️' : '▶️'}
          </span>
          <span className="text-bedtime-purple-dark font-medium">
            {isPlaying ? 'Pause Narration' : 'Play Narration'}
          </span>
        </button>
      </div>

      {/* Choice section */}
      {showChoices && choices.length > 0 && (
        <>
          <div className="border-t-2 border-bedtime-purple-pale/30 pt-6 mb-4">
            <h4 className="text-lg font-display font-medium text-bedtime-purple mb-3 text-center">
              What happens next?
            </h4>
          </div>

          <div className="space-y-3">
            {choices.map((choice) => (
              <button
                key={choice.id}
                onClick={() => onChoiceClick?.(choice.id)}
                disabled={isLoading}
                className="
                  w-full bg-white text-bedtime-purple-dark
                  px-5 py-4 rounded-2xl
                  border-2 border-bedtime-purple-pale
                  hover:border-bedtime-purple hover:shadow-lg
                  transform hover:scale-[1.02] transition-all duration-200
                  active:scale-95
                  disabled:opacity-50 disabled:cursor-not-allowed
                  flex items-center gap-3
                  relative overflow-hidden
                  group
                "
              >
                {/* Bookmark tab effect */}
                <div className="absolute right-0 top-0 bottom-0 w-2 bg-gradient-to-b
                               from-bedtime-purple to-bedtime-blue
                               group-hover:w-3 transition-all duration-200" />

                <span className="text-2xl">{choice.id === 'A' ? '🅰️' : '🅱️'}</span>
                <span className="flex-1 text-left font-medium">{choice.label}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Loading state for choices */}
      {isLoading && (
        <div className="text-center py-6">
          <div className="spinner mx-auto mb-3" />
          <p className="text-bedtime-purple/60 text-sm">Weaving your choices...</p>
        </div>
      )}

      {/* Page number */}
      <div className="mt-6 text-center">
        <span className="text-bedtime-purple/40 text-sm font-medium">
          {pageNumber}
        </span>
      </div>
    </div>
  );
};

// ============================================================================
// Book Component (Combined Left + Right)
// ============================================================================

interface BookProps {
  leftPage: React.ReactNode;
  rightPage: React.ReactNode;
  isFlipping?: boolean;
}

export const Book: React.FC<BookProps> = ({ leftPage, rightPage, isFlipping = false }) => {
  return (
    <div className="
      grid grid-cols-1 md:grid-cols-2
      gap-0
      shadow-2xl
      rounded-3xl md:rounded-[2rem]
      overflow-hidden
      transform-gpu
      transition-transform duration-300
      hover:shadow-[0_25px_70px_-15px_rgba(139,122,184,0.3)]
    ">
      {/* Left page (image) - Hidden on mobile */}
      <div className="hidden md:block">
        {leftPage}
      </div>

      {/* Right page (text/audio/choices) */}
      <div>
        {rightPage}
      </div>
    </div>
  );
};

// ============================================================================
// Mobile Single Page Component (Image at top, content below)
// ============================================================================

export const MobileSinglePage: React.FC<{
  imageUrl: string;
  checkpointNumber: number;
  text: string;
  audioUrl: string;
  choices?: Array<{ id: 'A' | 'B'; label: string }>;
  onChoiceClick?: (choiceId: 'A' | 'B') => void;
  isLoading?: boolean;
}> = ({ imageUrl, checkpointNumber, text, audioUrl, choices, onChoiceClick, isLoading }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    const audioEl = audioRef.current;
    if (audioEl && audioUrl) {
      audioEl.src = audioUrl;
      audioEl.play().catch(() => null);
      setIsPlaying(true);
    }
  }, [audioUrl]);

  useEffect(() => {
    setImageLoaded(false);
  }, [imageUrl]);

  const handlePlayAudio = () => {
    const audioEl = audioRef.current;
    if (audioEl) {
      if (isPlaying) {
        audioEl.pause();
        setIsPlaying(false);
      } else {
        audioEl.play().catch(() => null);
        setIsPlaying(true);
      }
    }
  };

  return (
    <div className="bedtime-card max-w-2xl mx-auto">
      {/* Image section (always present) */}
      <div className="mb-6">
        <div className="w-full aspect-[4/3] relative">
          {!imageLoaded && (
            <div className="absolute inset-0 bg-bedtime-purple-pale/10 rounded-2xl animate-pulse" />
          )}
          <img
            src={imageUrl}
            alt="Story illustration"
            className={`
              w-full h-full object-cover rounded-2xl
              shadow-lg border-4 border-white
              transition-opacity duration-500
              ${imageLoaded ? 'opacity-100' : 'opacity-0'}
            `}
            onLoad={() => setImageLoaded(true)}
          />
        </div>
      </div>

      {/* Checkpoint header */}
      <div className="mb-4 flex items-center gap-2">
        <span className="text-2xl">📖</span>
        <h3 className="text-xl font-display font-medium text-bedtime-purple">
          Checkpoint {checkpointNumber}
        </h3>
      </div>

      {/* Story text */}
      <div className="mb-6">
        <p className="text-lg leading-relaxed text-bedtime-purple-dark whitespace-pre-wrap">
          {text}
        </p>
      </div>

      {/* Audio player */}
      <audio
        ref={audioRef}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
      />

      <div className="mb-6">
        <button
          onClick={handlePlayAudio}
          className="btn-primary w-full flex items-center justify-center gap-3"
        >
          <span className="text-2xl">{isPlaying ? '⏸️' : '▶️'}</span>
          <span>{isPlaying ? 'Pause Narration' : 'Play Narration'}</span>
        </button>
      </div>

      {/* Choices */}
      {choices && choices.length > 0 && (
        <>
          <div className="border-t-2 border-bedtime-purple-pale pt-6 mb-4">
            <h4 className="text-lg font-display font-medium text-bedtime-purple mb-3">
              What happens next?
            </h4>
          </div>

          <div className="space-y-3">
            {choices.map((choice) => (
              <button
                key={choice.id}
                onClick={() => onChoiceClick?.(choice.id)}
                disabled={isLoading}
                className="btn-choice flex items-center gap-3"
              >
                <span className="text-2xl">{choice.id === 'A' ? '🅰️' : '🅱️'}</span>
                <span className="flex-1 text-left">{choice.label}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {isLoading && (
        <div className="text-center py-6">
          <div className="spinner mx-auto mb-3" />
          <p className="text-bedtime-purple/60">Weaving your choices...</p>
        </div>
      )}
    </div>
  );
};
