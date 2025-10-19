import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { GENDERS, AGE_GROUPS } from '../lib/constants';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787';

interface ChildProfile {
  id: string;
  user_id: string;
  name: string;
  gender: string;
  age_range: string;
  interests: string;
  context: string;
  created_at: string;
  updated_at: string;
}

export const Profiles: React.FC = () => {
  const { accessToken } = useAuth();
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<ChildProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingProfile, setEditingProfile] = useState<ChildProfile | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [gender, setGender] = useState<string>('');
  const [ageRange, setAgeRange] = useState<string>('');
  const [interests, setInterests] = useState('');
  const [context, setContext] = useState('');
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    try {
      const response = await fetch(`${API_URL}/api/profiles`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setProfiles(data.profiles || []);
      } else {
        setError('Failed to load profiles');
      }
    } catch (error) {
      console.error('Failed to fetch profiles', error);
      setError('Failed to load profiles');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setName('');
    setGender('');
    setAgeRange('');
    setInterests('');
    setContext('');
    setFormError('');
    setEditingProfile(null);
  };

  const handleCreateNew = () => {
    resetForm();
    setShowForm(true);
  };

  const handleEdit = (profile: ChildProfile) => {
    setEditingProfile(profile);
    setName(profile.name);
    setGender(profile.gender);
    setAgeRange(profile.age_range);
    setInterests(profile.interests);
    setContext(profile.context);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setIsSaving(true);

    try {
      const payload = {
        name,
        gender,
        age_range: ageRange,
        interests,
        context,
      };

      let response;
      if (editingProfile) {
        // Update existing profile
        response = await fetch(`${API_URL}/api/profiles/${editingProfile.id}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
      } else {
        // Create new profile
        response = await fetch(`${API_URL}/api/profiles`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
      }

      if (response.ok) {
        await fetchProfiles();
        setShowForm(false);
        resetForm();
      } else {
        const errorData = await response.json();
        setFormError(errorData.message || 'Failed to save profile');
      }
    } catch (error) {
      console.error('Failed to save profile', error);
      setFormError('Failed to save profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (profileId: string) => {
    if (!confirm('Are you sure you want to delete this profile?')) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/profiles/${profileId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        await fetchProfiles();
      } else {
        alert('Failed to delete profile');
      }
    } catch (error) {
      console.error('Failed to delete profile', error);
      alert('Failed to delete profile');
    }
  };

  const handleUseProfile = (profile: ChildProfile) => {
    // Navigate to create page with profile data as state
    navigate('/create', { state: { profile } });
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
          <h1 className="text-4xl text-bedtime-purple font-display font-semibold">
            Child Profiles
          </h1>
          <div className="flex gap-4">
            <button onClick={() => navigate('/dashboard')} className="btn-secondary">
              Back to Dashboard
            </button>
            <button onClick={handleCreateNew} className="btn-primary">
              Create New Profile
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {showForm && (
          <div className="bedtime-card mb-8">
            <h2 className="text-2xl text-bedtime-purple font-display font-medium mb-6">
              {editingProfile ? 'Edit Profile' : 'Create New Profile'}
            </h2>

            {formError && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label-bedtime">Child's Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-bedtime"
                  required
                />
              </div>

              <div>
                <label className="label-bedtime">Gender</label>
                <div className="flex gap-4">
                  {GENDERS.map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGender(g)}
                      className={`px-6 py-2 rounded-full font-body transition-all ${
                        gender === g
                          ? 'bg-bedtime-purple text-white'
                          : 'bg-white text-bedtime-purple border-2 border-bedtime-purple/30'
                      }`}
                    >
                      {g === 'male' ? 'Boy' : 'Girl'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="label-bedtime">Age Range</label>
                <div className="flex gap-4">
                  {AGE_GROUPS.map((age) => (
                    <button
                      key={age}
                      type="button"
                      onClick={() => setAgeRange(age)}
                      className={`px-6 py-2 rounded-full font-body transition-all ${
                        ageRange === age
                          ? 'bg-bedtime-purple text-white'
                          : 'bg-white text-bedtime-purple border-2 border-bedtime-purple/30'
                      }`}
                    >
                      {age}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="label-bedtime">
                  Interests (comma-separated)
                </label>
                <input
                  type="text"
                  value={interests}
                  onChange={(e) => setInterests(e.target.value)}
                  className="input-bedtime"
                  placeholder="e.g., dinosaurs, space, reading"
                  required
                />
              </div>

              <div>
                <label className="label-bedtime">
                  Additional Context (optional)
                </label>
                <textarea
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  className="input-bedtime"
                  rows={3}
                  placeholder="Any special details about your child..."
                />
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="btn-primary flex-1"
                >
                  {isSaving ? 'Saving...' : editingProfile ? 'Update Profile' : 'Create Profile'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div>
          {profiles.length === 0 ? (
            <p className="text-bedtime-purple-dark">
              No profiles yet. Create one to get started!
            </p>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {profiles.map((profile) => (
                <div key={profile.id} className="bedtime-card">
                  <h3 className="text-xl text-bedtime-purple font-display font-medium mb-2">
                    {profile.name}
                  </h3>
                  <p className="text-sm text-bedtime-purple-dark mb-2">
                    {profile.gender === 'male' ? 'Boy' : 'Girl'} • Age {profile.age_range}
                  </p>
                  <p className="text-sm text-bedtime-purple-dark mb-2">
                    <strong>Interests:</strong> {profile.interests}
                  </p>
                  {profile.context && (
                    <p className="text-sm text-bedtime-purple-dark mb-4">
                      <strong>Context:</strong> {profile.context}
                    </p>
                  )}
                  <div className="space-y-2">
                    <button
                      onClick={() => handleUseProfile(profile)}
                      className="btn-primary w-full"
                    >
                      Use for Story
                    </button>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(profile)}
                        className="btn-secondary flex-1"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(profile.id)}
                        className="btn-secondary flex-1"
                      >
                        Delete
                      </button>
                    </div>
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
