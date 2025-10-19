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

export const Dashboard: React.FC = () => {
  const { user, accessToken, logout } = useAuth();
  const [stories, setStories] = useState<SavedStory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchStories();
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
          <button onClick={logout} className="btn-secondary">
            Sign Out
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
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
