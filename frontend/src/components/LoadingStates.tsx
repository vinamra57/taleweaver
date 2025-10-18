import { useEffect, useState } from 'react';
import { LOADING_MESSAGES } from '../lib/constants';

interface LoadingSpinnerProps {
  message?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ message }) => {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-8">
      <div className="spinner"></div>
      {message && (
        <p className="text-bedtime-yellow text-lg animate-pulse">
          {message}
        </p>
      )}
    </div>
  );
};

export const StoryLoadingState: React.FC = () => {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="container-bedtime">
      <div className="bedtime-card text-center stars-bg">
        <div className="flex flex-col items-center gap-6">
          <div className="text-6xl animate-float">
            ✨
          </div>
          <h2 className="text-3xl text-bedtime-yellow text-shadow-glow">
            {LOADING_MESSAGES[messageIndex]}
          </h2>
          <div className="spinner"></div>
          <div className="flex gap-2 mt-4">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="w-3 h-3 rounded-full bg-bedtime-yellow"
                style={{
                  animation: `pulse 1.5s ease-in-out ${i * 0.2}s infinite`,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export const ErrorState: React.FC<{ message: string; onRetry?: () => void }> = ({
  message,
  onRetry,
}) => {
  return (
    <div className="container-bedtime">
      <div className="bedtime-card text-center">
        <div className="text-6xl mb-4">😔</div>
        <h2 className="text-2xl mb-4 text-bedtime-yellow">Oops!</h2>
        <p className="text-bedtime-cream-warm mb-6">{message}</p>
        {onRetry && (
          <button onClick={onRetry} className="btn-primary">
            Try Again
          </button>
        )}
      </div>
    </div>
  );
};
