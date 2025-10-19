import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../lib/constants';
import type { ClonedVoice } from '../lib/types';
import { useAuth } from '../contexts/AuthContext';

export function ClonedVoices() {
  const navigate = useNavigate();
  const { accessToken } = useAuth();
  const [voices, setVoices] = useState<ClonedVoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    if (accessToken) {
      fetchVoices();
    }
  }, [accessToken]);

  const fetchVoices = async () => {
    try {
      if (!accessToken) {
        navigate('/login');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/voices/cloned`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.status === 401) {
        navigate('/login');
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch cloned voices');
      }

      const data = await response.json();
      setVoices(data.voices || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load cloned voices');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (voiceId: string) => {
    setDeletingId(voiceId);
    setError(null);

    try {
      if (!accessToken) {
        navigate('/login');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/voices/cloned/${voiceId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.status === 401) {
        navigate('/login');
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to delete voice');
        }

      // Remove from list
      setVoices((prev) => prev.filter((v) => v.id !== voiceId));
      setShowDeleteConfirm(null);
    } catch (err: any) {
      setError(err.message || 'Failed to delete voice');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-bedtime-cream via-bedtime-lavender-pale to-bedtime-cream-warm">
        <div className="container mx-auto px-4 py-16">
          <div className="text-center">
            <div className="spinner mx-auto mb-4"></div>
            <p className="text-bedtime-purple-dark">Loading your cloned voices...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-bedtime-cream via-bedtime-lavender-pale to-bedtime-cream-warm">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold text-bedtime-purple mb-2">
                Your Cloned Voices
              </h1>
              <p className="text-bedtime-purple-dark">
                Manage the voices you've cloned for personalized storytelling
              </p>
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              className="btn-secondary"
            >
              Back to Dashboard
            </button>
          </div>

          {error && (
            <div className="bg-red-100 text-red-800 p-4 rounded-lg mb-6">
              {error}
            </div>
          )}

          {voices.length === 0 ? (
            <div className="bedtime-card text-center py-12">
              <div className="text-6xl mb-4">🎤</div>
              <h3 className="text-2xl font-semibold text-bedtime-purple mb-2">
                No Cloned Voices Yet
              </h3>
              <p className="text-bedtime-purple-dark mb-6">
                Create a story and choose "Clone Your Voice" to get started
              </p>
              <button
                onClick={() => navigate('/create')}
                className="btn-primary"
              >
                Create Your First Story
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {voices.map((voice) => (
                <div
                  key={voice.id}
                  className="bedtime-card flex items-center justify-between"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="text-4xl">🎤</div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg text-bedtime-purple">
                        {voice.name}
                      </h3>
                      <p className="text-sm text-bedtime-purple-dark">
                        Created on {new Date(voice.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                      <p className="text-xs text-bedtime-purple-dark/70 mt-1">
                        Voice ID: {voice.voice_id}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {showDeleteConfirm === voice.id ? (
                      <>
                        <button
                          onClick={() => handleDelete(voice.id)}
                          disabled={deletingId === voice.id}
                          className="btn-secondary bg-red-500 text-white hover:bg-red-600 disabled:opacity-50"
                        >
                          {deletingId === voice.id ? 'Deleting...' : 'Confirm Delete'}
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(null)}
                          disabled={deletingId === voice.id}
                          className="btn-secondary"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setShowDeleteConfirm(voice.id)}
                        className="btn-secondary hover:bg-red-50 hover:text-red-600 hover:border-red-300"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-8 bedtime-card bg-bedtime-lavender-pale">
            <h3 className="font-semibold text-bedtime-purple mb-2">
              About Cloned Voices
            </h3>
            <ul className="text-sm text-bedtime-purple-dark space-y-1">
              <li>• Cloned voices are saved to your account and can be reused for future stories</li>
              <li>• Each voice is stored securely with ElevenLabs voice cloning technology</li>
              <li>• You can delete voices you no longer need at any time</li>
              <li>• Create new voices anytime when generating a story</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
