import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787';

interface SavedStory {
  id: string;
  session_id: string;
  title: string;
  child_name: string;
  moral_focus: string;
  interactive: boolean;
  created_at: string;
  last_played_at: string;
}

interface SavedSong {
  id: string;
  session_id: string;
  title: string;
  child_name: string;
  moral_focus: string;
  song_type: 'song' | 'rhyme' | 'instrumental';
  musical_style: 'lullaby' | 'pop' | 'folk' | 'classical' | 'jazz';
  duration_seconds: number;
  created_at: string;
  last_played_at: string;
}

export const Dashboard: React.FC = () => {
  const { user, accessToken, logout } = useAuth();
  const [stories, setStories] = useState<SavedStory[]>([]);
  const [songs, setSongs] = useState<SavedSong[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchStories();
    fetchSongs();
  }, []);

  const fetchStories = async () => {
    try {
      const response = await fetch(`${API_URL}/api/stories`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStories(data.stories || []);
      } else {
        setError('Failed to load stories');
      }
    } catch (error) {
      console.error('Failed to fetch stories', error);
      setError('Failed to load stories');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSongs = async () => {
    try {
      const response = await fetch(`${API_URL}/api/songs`, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      if (response.ok) {
        const data = await response.json();
        setSongs(data.songs || []);
      }
    } catch (error) {
      // non-fatal
      console.warn('Failed to fetch songs', error);
    }
  };

  const handleDelete = async (storyId: string) => {
    setDeletingId(storyId);
    setError('');

    try {
      const response = await fetch(`${API_URL}/api/stories/${storyId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        setStories((prev) => prev.filter((s) => s.id !== storyId));
        setShowDeleteConfirm(null);
      } else {
        const data = await response.json();
        setError(data.message || 'Failed to delete story');
      }
    } catch (error) {
      console.error('Failed to delete story', error);
      setError('Failed to delete story');
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="container-bedtime min-h-screen flex items-center justify-center">
        <p className="text-xl text-bedtime-purple">Loading...</p>
      </div>
    );
  }

  return (
    <div className="container-bedtime min-h-screen">
      <div className="pt-8 pb-8">
        <div className="flex justify-between items-center mb-8">
           <div>
             <h1 className="text-4xl text-bedtime-purple font-display font-semibold">
               Welcome back, {user?.name}!
             </h1>
             <p className="text-bedtime-purple-dark mt-2">
               {user?.email}
             </p>
           </div>
           <div className="flex gap-4">
             <button
               onClick={() => navigate('/')}
               className="btn-secondary"
             >
               Home
             </button>
             <button onClick={logout} className="btn-secondary">
               Sign Out
             </button>
           </div>
         </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <button
            onClick={() => navigate('/create')}
            className="bedtime-card hover:shadow-xl transition-shadow text-left"
          >
            <h3 className="text-2xl text-bedtime-purple font-display font-medium mb-2">
              Create New Story
            </h3>
            <p className="text-bedtime-purple-dark">
              Generate a magical bedtime story
            </p>
          </button>

          <button
            onClick={() => navigate('/profiles')}
            className="bedtime-card hover:shadow-xl transition-shadow text-left"
          >
            <h3 className="text-2xl text-bedtime-purple font-display font-medium mb-2">
              Manage Child Profiles
            </h3>
            <p className="text-bedtime-purple-dark">
              Save profiles for quick story creation
            </p>
          </button>

          <button
            onClick={() => navigate('/cloned-voices')}
            className="bedtime-card hover:shadow-xl transition-shadow text-left"
          >
            <h3 className="text-2xl text-bedtime-purple font-display font-medium mb-2">
              Your Cloned Voices
            </h3>
            <p className="text-bedtime-purple-dark">
              Manage voices for personalized narration
            </p>
          </button>
        </div>

        <div>
          <h2 className="text-3xl text-bedtime-purple font-display font-medium mb-6">
            Your Stories
          </h2>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {stories.length === 0 ? (
            <p className="text-bedtime-purple-dark">
              No saved stories yet. Create your first story!
            </p>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {stories.map((story) => (
                <div key={story.id} className="bedtime-card">
                  <h3 className="text-xl text-bedtime-purple font-display font-medium mb-2">
                    {story.title}
                  </h3>
                  <p className="text-sm text-bedtime-purple-dark mb-4">
                    {story.child_name} • {story.moral_focus}
                    {story.interactive && ' • Interactive'}
                  </p>
                  <div className="space-y-2">
                    <button
                      onClick={() => navigate(`/play?storyId=${story.id}`)}
                      className="btn-primary w-full"
                    >
                      Play Story
                    </button>

                    {showDeleteConfirm === story.id ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDelete(story.id)}
                          disabled={deletingId === story.id}
                          className="btn-secondary flex-1 bg-red-500 text-white hover:bg-red-600 disabled:opacity-50"
                        >
                          {deletingId === story.id ? 'Deleting...' : 'Confirm'}
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(null)}
                          disabled={deletingId === story.id}
                          className="btn-secondary flex-1"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowDeleteConfirm(story.id)}
                        className="btn-secondary w-full hover:bg-red-50 hover:text-red-600 hover:border-red-300"
                      >
                        Delete Story
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-12">
          <h2 className="text-3xl text-bedtime-purple font-display font-medium mb-6">
            Your Songs
          </h2>
          {songs.length === 0 ? (
            <p className="text-bedtime-purple-dark">No saved songs yet. Compose one!</p>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {songs.map((song) => (
                <div key={song.id} className="bedtime-card">
                  <h3 className="text-xl text-bedtime-purple font-display font-medium mb-2">
                    {song.title}
                  </h3>
                  <p className="text-sm text-bedtime-purple-dark mb-4">
                    {song.child_name} • {song.moral_focus} • {song.musical_style}
                  </p>
                  <div className="space-y-2">
                    <button
                      onClick={async () => {
                        try {
                          const res = await fetch(`${API_URL}/api/songs/${song.id}`, {
                            headers: { 'Authorization': `Bearer ${accessToken}` },
                          });
                          if (res.ok) {
                            const data = await res.json();
                            const session = data.session;
                            sessionStorage.setItem('taleweaver.songSession', JSON.stringify({
                              session_id: song.session_id,
                              child_name: song.child_name,
                              audio_url: session.audio_url,
                              title: song.title,
                              lyrics: session.lyrics,
                              duration_seconds: song.duration_seconds,
                              song_type: song.song_type,
                              theme: session.theme,
                              moral_focus: song.moral_focus,
                              musical_style: song.musical_style,
                              voice_selection: session.voice_selection,
                              created_at: song.created_at,
                            }));
                            navigate('/play-song');
                          }
                        } catch (e) {
                          console.warn('Failed to open saved song');
                        }
                      }}
                      className="btn-primary w-full"
                    >
                      Play Song
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
