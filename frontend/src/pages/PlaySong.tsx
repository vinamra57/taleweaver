import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { SONG_SESSION_STORAGE_KEY } from '../lib/constants';
import type { SongRequest, StoredSongSession } from '../lib/types';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';

export const PlaySong: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [session, setSession] = useState<StoredSongSession | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(
    Boolean((location.state as any)?.pending)
  );
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated, accessToken } = useAuth();

  const handleSaveSong = async () => {
    if (!session || !isAuthenticated) return;
    const title = prompt('Enter a title for this song:', session.title || 'My Song');
    if (!title || title.trim() === '') return;
    try {
      const res = await fetch(`${(import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8787'}/api/songs/save`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ session_id: session.session_id, title: title.trim() }),
      });
      if (res.ok) {
        alert('Song saved successfully!');
      } else {
        const data = await res.json();
        alert(data?.message || 'Failed to save song');
      }
    } catch (e) {
      alert('Failed to save song');
    }
  };
  // Guard to avoid duplicate API calls in React 18 StrictMode (dev)
  const hasRequestedRef = useRef(false);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(SONG_SESSION_STORAGE_KEY);
      if (stored) {
        setSession(JSON.parse(stored) as StoredSongSession);
      }
    } catch {
      setSession(null);
    }
  }, []);

  // If navigated here with pending state, kick off generation.
  useEffect(() => {
    const state = location.state as { pending?: boolean; request?: SongRequest } | null;
    if (!state?.pending || !state?.request) return;
    if (hasRequestedRef.current) return;
    hasRequestedRef.current = true;

    // Extract request to maintain type narrowing in async function
    const request = state.request;

    const generate = async () => {
      setIsGenerating(true);
      setError(null);
      try {
        const response = await api.createSong(request);
        const storedSession: StoredSongSession = {
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
        sessionStorage.setItem(SONG_SESSION_STORAGE_KEY, JSON.stringify(storedSession));
        setSession(storedSession);
      } catch (err: any) {
        setError(err?.message ?? 'Failed to create song. Please try again.');
      } finally {
        setIsGenerating(false);
        // Clear pending navigation state (replace in-place)
        navigate('.', { replace: true, state: {} });
      }
    };

    generate();
  }, [location.state]);

  if (isGenerating) {
    return (
      <div className="container-bedtime min-h-screen flex flex-col items-center justify-center gap-6 text-center">
        <div className="text-6xl">🎵</div>
        <h2 className="text-3xl font-display text-bedtime-purple">Composing your song…</h2>
        <p className="text-bedtime-purple-dark font-body">This may take a few moments.</p>
        <div className="spinner" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-bedtime min-h-screen flex flex-col items-center justify-center gap-6 text-center">
        <h2 className="text-3xl font-display text-bedtime-purple">We hit a snag</h2>
        <p className="text-bedtime-purple-dark font-body">{error}</p>
        <button onClick={() => navigate('/create-song')} className="btn-primary">Try Again</button>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="container-bedtime min-h-screen flex flex-col items-center justify-center gap-6 text-center">
        <h2 className="text-3xl font-display text-bedtime-purple">
          No song loaded yet
        </h2>
        <p className="text-bedtime-purple-dark font-body">
          Create a song first so we can play it for you.
        </p>
        <button
          onClick={() => navigate('/create-song')}
          className="btn-primary"
        >
          Create a Song
        </button>
      </div>
    );
  }

  return (
    <div className="container-bedtime min-h-screen pb-12">
      <div className="pt-8 mb-6 flex items-center justify-between">
        <button
          onClick={() => navigate('/')}
          className="text-bedtime-purple hover:text-bedtime-purple-dark transition-colors flex items-center gap-2 font-body"
        >
          <span>←</span>
          <span>Back to Home</span>
        </button>
        <button
          onClick={() => navigate('/create-song')}
          className="btn-secondary"
        >
          Create Another Song
        </button>
      </div>

      <div className="bedtime-card max-w-3xl mx-auto text-center mb-8">
        <span className="inline-flex items-center gap-2 text-bedtime-purple font-body text-sm uppercase tracking-wide mb-4">
          <span role="img" aria-label="music">🎶</span>
          TaleWeaver Song
        </span>
        <h1 className="text-4xl font-display text-bedtime-purple mb-2">
          {session.title}
        </h1>
        <p className="text-bedtime-purple-dark font-body mb-6">
          Created for <strong>{session.child_name}</strong> • {session.song_type === 'instrumental' ? 'Instrumental' : 'With vocals'} • {session.musical_style.charAt(0).toUpperCase() + session.musical_style.slice(1)}
        </p>

        <audio
          controls
          className="w-full mt-4"
          src={session.audio_url}
        >
          Your browser does not support the audio element.
        </audio>

        <div className="flex flex-wrap gap-4 justify-center mt-6">
          <a
            href={session.audio_url}
            download={`${session.title.replace(/\s+/g, '_')}.mp3`}
            className="btn-primary"
          >
            Download MP3
          </a>
          {isAuthenticated && (
            <button onClick={handleSaveSong} className="btn-secondary">
              Save Song
            </button>
          )}
          <button
            onClick={() => navigate('/create-song')}
            className="btn-secondary"
          >
            Make Another
          </button>
        </div>
      </div>

      {(session.lyrics && session.song_type !== 'instrumental') && (
        <div className="bedtime-card max-w-3xl mx-auto">
          <h2 className="text-2xl font-display text-bedtime-purple mb-4">
            Lyrics Preview
          </h2>
          <p className="whitespace-pre-line text-bedtime-purple-dark font-body leading-relaxed">
            {session.lyrics}
          </p>
        </div>
      )}

      <div className="max-w-3xl mx-auto mt-8 grid md:grid-cols-2 gap-6">
        <div className="bedtime-card">
          <h3 className="text-lg font-display text-bedtime-purple mb-2">Theme</h3>
          <p className="text-bedtime-purple-dark font-body">
            {session.theme.charAt(0).toUpperCase() + session.theme.slice(1)}
          </p>
        </div>
        <div className="bedtime-card">
          <h3 className="text-lg font-display text-bedtime-purple mb-2">Lesson</h3>
          <p className="text-bedtime-purple-dark font-body capitalize">
            {session.moral_focus}
          </p>
        </div>
        <div className="bedtime-card">
          <h3 className="text-lg font-display text-bedtime-purple mb-2">Vocal style</h3>
          <p className="text-bedtime-purple-dark font-body capitalize">
            {session.voice_selection ?? 'Custom'}
          </p>
        </div>
        <div className="bedtime-card">
          <h3 className="text-lg font-display text-bedtime-purple mb-2">Duration</h3>
          <p className="text-bedtime-purple-dark font-body">
            ~{session.duration_seconds} seconds
          </p>
        </div>
      </div>
    </div>
  );
};
