import { useEffect, useState } from 'react';
import {
  AGE_GROUPS,
  CHARACTER_PRESETS,
  COMMON_INTERESTS,
  DEFAULT_DURATION_MIN,
  DEFAULT_INTERACTIVE,
  DURATIONS,
  GENDERS,
  MAX_INTERESTS,
  MORAL_FOCI,
  DEFAULT_MORAL_FOCUS,
  VOICE_OPTIONS,
  API_BASE_URL,
} from '../lib/constants';
import {
  AgeGroup,
  Child,
  ChildSchema,
  DurationMin,
  Gender,
  MoralFocus,
  StartRequest,
  VoiceSelection,
  ClonedVoice,
} from '../lib/types';
import { VoiceRecorder } from './VoiceRecorder';
import { useAuth } from '../contexts/AuthContext';

interface StoryFormProps {
  onSubmit: (request: StartRequest) => void;
  isLoading?: boolean;
  presetKey?: string | null;
  profileData?: any;
}

type ChildFormState = Omit<Child, 'context'> & { context: string };
type FormErrors = Record<string, string>;

const DEFAULT_GENDER: Gender = (GENDERS[0] ?? 'female') as Gender;
const DEFAULT_AGE_GROUP: AgeGroup = (AGE_GROUPS[1] ?? AGE_GROUPS[0]) as AgeGroup;

const createDefaultChildState = (): ChildFormState => ({
  name: '',
  gender: DEFAULT_GENDER,
  age_group: DEFAULT_AGE_GROUP,
  interests: [],
  context: '',
});

const sanitizeChild = (formData: ChildFormState): Child => {
  const { context, ...rest } = formData;

  const uniqueInterests = Array.from(
    new Set(
      rest.interests
        .map((interest) => interest.trim())
        .filter((interest) => interest.length > 0),
    ),
  );

  const trimmedContext = context.trim();

  return {
    ...rest,
    name: rest.name.trim(),
    interests: uniqueInterests,
    ...(trimmedContext ? { context: trimmedContext } : {}),
  };
};

const pillButtonClasses = (selected: boolean) =>
  selected
    ? 'px-4 py-2 rounded-full text-sm font-semibold bg-bedtime-yellow text-white shadow-md transition-all'
    : 'px-4 py-2 rounded-full text-sm font-semibold bg-white text-bedtime-purple-dark border-2 border-bedtime-purple-pale hover:border-bedtime-purple transition-all';

const toggleButtonClasses = (selected: boolean) =>
  selected
    ? 'px-4 py-3 rounded-2xl font-semibold bg-bedtime-purple text-white shadow-md transition-all'
    : 'px-4 py-3 rounded-2xl font-semibold bg-white text-bedtime-purple-dark border-2 border-bedtime-purple-pale hover:border-bedtime-purple transition-all';

export const StoryForm: React.FC<StoryFormProps> = ({
  onSubmit,
  isLoading = false,
  presetKey = null,
  profileData = null,
}) => {
  const { accessToken, isAuthenticated } = useAuth();
  const [formData, setFormData] = useState<ChildFormState>(() => createDefaultChildState());
  const [durationMin, setDurationMin] = useState<DurationMin>(DEFAULT_DURATION_MIN);
  const [interactive, setInteractive] = useState<boolean>(DEFAULT_INTERACTIVE);
  const [moralFocus, setMoralFocus] = useState<MoralFocus>(DEFAULT_MORAL_FOCUS);
  const [voiceSelection, setVoiceSelection] = useState<VoiceSelection>('custom');
  const [errors, setErrors] = useState<FormErrors>({});
  const [customInterest, setCustomInterest] = useState('');
  const [activePresetKey, setActivePresetKey] = useState<string | null>(null);

  // Voice cloning state
  const [clonedVoices, setClonedVoices] = useState<ClonedVoice[]>([]);
  const [selectedClonedVoiceId, setSelectedClonedVoiceId] = useState<string | null>(null);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [isCloning, setIsCloning] = useState(false);
  const [cloneError, setCloneError] = useState<string | null>(null);
  const [cloneSuccess, setCloneSuccess] = useState<string | null>(null);

  const clearFieldError = (field: string) => {
    setErrors((prev) => {
      if (!prev[field]) {
        return prev;
      }
      const { [field]: _removed, ...rest } = prev;
      return rest;
    });
  };

  const markCustom = () => {
    setActivePresetKey(null);
  };

  const applyPreset = (key: string) => {
    const preset = CHARACTER_PRESETS[key];
    if (!preset) {
      return;
    }

    setFormData({
      name: preset.child.name,
      gender: preset.child.gender,
      age_group: preset.child.age_group,
      interests: [...preset.child.interests],
      context: preset.child.context ?? '',
    });
    setDurationMin(preset.duration_min);
    setInteractive(preset.interactive);
    setErrors({});
    setCustomInterest('');
    setActivePresetKey(key);
  };

  useEffect(() => {
    if (presetKey && CHARACTER_PRESETS[presetKey]) {
      applyPreset(presetKey);
    }
  }, [presetKey]);

  useEffect(() => {
    if (profileData) {
      // Convert profile data from backend format to form format
      const interests = profileData.interests
        ? profileData.interests.split(',').map((i: string) => i.trim())
        : [];

      setFormData({
        name: profileData.name || '',
        gender: profileData.gender || DEFAULT_GENDER,
        age_group: profileData.age_range || DEFAULT_AGE_GROUP,
        interests: interests,
        context: profileData.context || '',
      });
      setErrors({});
      setCustomInterest('');
      setActivePresetKey(null);
    }
  }, [profileData]);

  // Fetch cloned voices on mount
  useEffect(() => {
    const fetchClonedVoices = async () => {
      try {
        if (!accessToken) return; // Not authenticated

        const response = await fetch(`${API_BASE_URL}/api/voices/cloned`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setClonedVoices(data.voices || []);
        }
      } catch (error) {
        console.error('Failed to fetch cloned voices:', error);
      }
    };

    fetchClonedVoices();
  }, [accessToken]);

  const handleInterestToggle = (interest: string) => {
    markCustom();
    setFormData((prev) => {
      const alreadySelected = prev.interests.includes(interest);

      if (alreadySelected) {
        const updated = prev.interests.filter((item) => item !== interest);
        clearFieldError('interests');
        return { ...prev, interests: updated };
      }

      if (prev.interests.length >= MAX_INTERESTS) {
        setErrors((prevErrors) => ({
          ...prevErrors,
          interests: `Choose up to ${MAX_INTERESTS} interests.`,
        }));
        return prev;
      }

      clearFieldError('interests');
      return { ...prev, interests: [...prev.interests, interest] };
    });
  };

  const handleAddCustomInterest = () => {
    const trimmed = customInterest.trim();
    if (!trimmed) {
      return;
    }

    markCustom();
    setFormData((prev) => {
      const normalized = trimmed.toLowerCase();
      const alreadySelected = prev.interests.some(
        (interest) => interest.toLowerCase() === normalized,
      );

      if (alreadySelected) {
        return prev;
      }

      if (prev.interests.length >= MAX_INTERESTS) {
        setErrors((prevErrors) => ({
          ...prevErrors,
          interests: `Choose up to ${MAX_INTERESTS} interests.`,
        }));
        return prev;
      }

      clearFieldError('interests');
      return { ...prev, interests: [...prev.interests, trimmed] };
    });
    setCustomInterest('');
  };

  const handleVoiceClone = async (audioFile: File, voiceName: string) => {
    setIsCloning(true);
    setCloneError(null);
    setCloneSuccess(null);

    try {
      if (!accessToken) {
        setCloneError('Please log in to clone your voice');
        setIsCloning(false);
        return;
      }

      const formData = new FormData();
      formData.append('name', voiceName);
      formData.append('audio', audioFile);

      const response = await fetch(`${API_BASE_URL}/api/voices/clone`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Voice cloning failed');
      }

      const data = await response.json();
      const newVoice: ClonedVoice = data.voice;

      // Add to cloned voices list
      setClonedVoices((prev) => [newVoice, ...prev]);

      // Auto-select the new voice
      setSelectedClonedVoiceId(newVoice.voice_id);

      // Hide recorder and show success
      setShowVoiceRecorder(false);
      setCloneSuccess(`Voice "${voiceName}" cloned successfully!`);

      // Clear success message after 5 seconds
      setTimeout(() => setCloneSuccess(null), 5000);
    } catch (error: any) {
      setCloneError(error.message || 'Failed to clone voice');
    } finally {
      setIsCloning(false);
    }
  };

  const handleVoiceSelectionChange = (selection: 'custom' | 'clone' | PresetVoice) => {
    setVoiceSelection(selection);
    setCloneError(null);
    setCloneSuccess(null);

    if (selection === 'clone') {
      // Show recorder if no cloned voices OR if user wants to record new
      // For now, always show the option to record new
    } else {
      setShowVoiceRecorder(false);
      setSelectedClonedVoiceId(null);
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setErrors({});

    const candidate = sanitizeChild(formData);

    try {
      const validated = ChildSchema.parse(candidate);

      // Update local state with trimmed values for consistency
      setFormData((prev) => ({
        ...prev,
        name: validated.name,
        interests: [...validated.interests],
        context: validated.context ?? '',
      }));

      // Determine final voice selection
      let finalVoiceSelection: VoiceSelection = voiceSelection;

      if (voiceSelection === 'clone') {
        if (!isAuthenticated) {
          setErrors({ voice: 'Please log in to use voice cloning' });
          return;
        }
        if (selectedClonedVoiceId) {
          // Use selected cloned voice
          finalVoiceSelection = `cloned:${selectedClonedVoiceId}`;
        } else {
          setErrors({ voice: 'Please select or clone a voice' });
          return;
        }
      }

      const payload: StartRequest = {
        child: validated,
        duration_min: durationMin,
        interactive,
        moral_focus: moralFocus,
        voice_selection: finalVoiceSelection,
      };

      onSubmit(payload);
    } catch (error: any) {
      if (error?.errors) {
        const fieldErrors: FormErrors = {};
        error.errors.forEach((issue: any) => {
          const field = issue.path?.[0];
          if (typeof field === 'string' && !fieldErrors[field]) {
            fieldErrors[field] = issue.message;
          }
        });
        setErrors(fieldErrors);
      } else {
        console.error(error);
      }
    }
  };

  const customInterests = formData.interests.filter(
    (interest) =>
      !COMMON_INTERESTS.includes(interest as (typeof COMMON_INTERESTS)[number]),
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bedtime-card">
        <h3 className="bedtime-card-header">
          <span className="star">⭐</span>
          <span>Quick Start Characters</span>
        </h3>
        <div className="flex flex-col gap-3 md:flex-row">
          {Object.entries(CHARACTER_PRESETS).map(([key, preset]) => {
            const isActive = activePresetKey === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => applyPreset(key)}
                className={`btn-secondary flex-1 text-left transition-all ${
                  isActive ? 'ring-4 ring-bedtime-yellow/60' : ''
                }`}
              >
                <div className="font-semibold text-lg">
                  {preset.child.name}
                </div>
                <div className="text-sm text-bedtime-cream-warm/90 mt-1">
                  Ages {preset.child.age_group} • {preset.interactive ? 'Interactive' : 'Classic'} •{' '}
                  {preset.duration_min} min
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="bedtime-card">
        <h3 className="bedtime-card-header">
          <span className="star">✨</span>
          <span>Create Your Character</span>
        </h3>

        <div className="mb-4">
          <label className="label-bedtime">Child&apos;s Name</label>
          <input
            type="text"
            value={formData.name}
            onChange={(event) => {
              markCustom();
              const value = event.target.value;
              setFormData((prev) => ({ ...prev, name: value }));
              clearFieldError('name');
            }}
            className="input-bedtime"
            placeholder="Enter name..."
          />
          {errors.name && (
            <p className="text-red-400 text-sm mt-1">{errors.name}</p>
          )}
        </div>

        <div className="mb-4">
          <label className="label-bedtime">Gender</label>
          <div className="flex gap-2 flex-wrap">
            {GENDERS.map((gender) => (
              <button
                key={gender}
                type="button"
                onClick={() => {
                  markCustom();
                  setFormData((prev) => ({ ...prev, gender }));
                  clearFieldError('gender');
                }}
                className={pillButtonClasses(formData.gender === gender)}
              >
                {gender === 'male' ? 'Boy' : 'Girl'}
              </button>
            ))}
          </div>
          {errors.gender && (
            <p className="text-red-400 text-sm mt-1">{errors.gender}</p>
          )}
        </div>

        <div className="mb-4">
          <label className="label-bedtime">Age Group</label>
          <div className="flex gap-2 flex-wrap">
            {AGE_GROUPS.map((group) => (
              <button
                key={group}
                type="button"
                onClick={() => {
                  markCustom();
                  setFormData((prev) => ({ ...prev, age_group: group }));
                  clearFieldError('age_group');
                }}
                className={pillButtonClasses(formData.age_group === group)}
              >
                Ages {group}
              </button>
            ))}
          </div>
          {errors.age_group && (
            <p className="text-red-400 text-sm mt-1">{errors.age_group}</p>
          )}
        </div>

        <div className="mb-4">
          <label className="label-bedtime">Interests</label>
          <p className="text-sm text-bedtime-purple/70 mb-2">
            Pick up to {MAX_INTERESTS} interests to weave into the story.
          </p>
          <div className="flex flex-wrap gap-2 mb-3">
            {COMMON_INTERESTS.map((interest) => {
              const isSelected = formData.interests.includes(interest);
              return (
                <button
                  key={interest}
                  type="button"
                  onClick={() => handleInterestToggle(interest)}
                  className={pillButtonClasses(isSelected)}
                >
                  {interest}
                </button>
              );
            })}
          </div>

          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={customInterest}
              onChange={(event) => setCustomInterest(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  handleAddCustomInterest();
                }
              }}
              className="input-bedtime flex-1"
              placeholder="Add custom interest..."
            />
            <button
              type="button"
              onClick={handleAddCustomInterest}
              className="btn-secondary"
            >
              Add
            </button>
          </div>

          <p className="text-xs text-bedtime-purple/70 mb-2">
            Selected {formData.interests.length}/{MAX_INTERESTS}
          </p>

          {customInterests.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {customInterests.map((interest) => (
                <div
                  key={interest}
                  className="inline-flex items-center bg-bedtime-yellow text-bedtime-purple-dark px-4 py-2 rounded-full text-sm font-bold"
                >
                  {interest}
                  <button
                    type="button"
                    onClick={() => handleInterestToggle(interest)}
                    className="ml-2"
                    aria-label={`Remove ${interest}`}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {errors.interests && (
            <p className="text-red-400 text-sm mt-2">{errors.interests}</p>
          )}
        </div>

        <div className="mb-4">
          <label className="label-bedtime">Story Mode</label>
          <div className="flex flex-col md:flex-row gap-3">
            <button
              type="button"
              onClick={() => {
                markCustom();
                setInteractive(true);
              }}
              className={`${toggleButtonClasses(interactive)} flex-1`}
            >
              Interactive Choices
            </button>
            <button
              type="button"
              onClick={() => {
                markCustom();
                setInteractive(false);
              }}
              className={`${toggleButtonClasses(!interactive)} flex-1`}
            >
              Classic Story
            </button>
          </div>
        </div>

        <div className="mb-4">
          <label className="label-bedtime">Story Length</label>
          <div className="flex gap-2 flex-wrap">
            {DURATIONS.map((duration) => (
              <button
                key={duration}
                type="button"
                onClick={() => {
                  markCustom();
                  setDurationMin(duration);
                }}
                className={pillButtonClasses(durationMin === duration)}
              >
                {duration} minute{duration > 1 ? 's' : ''}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <label className="label-bedtime">Moral Focus</label>
          <div className="flex gap-2 flex-wrap">
            {MORAL_FOCI.map((mf) => (
              <button
                key={mf}
                type="button"
                onClick={() => setMoralFocus(mf)}
                className={pillButtonClasses(moralFocus === mf)}
              >
                {mf[0].toUpperCase() + mf.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <label className="label-bedtime">Choose Narrator Voice</label>
          <p className="text-sm text-bedtime-purple-dark mb-3">
            Select who will tell your story
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {VOICE_OPTIONS.map((voice) => (
              <button
                key={voice.id}
                type="button"
                onClick={() => handleVoiceSelectionChange(voice.id as any)}
                className={`p-4 rounded-2xl text-left transition-all ${
                  voiceSelection === voice.id
                    ? 'bg-bedtime-yellow text-white shadow-lg border-2 border-bedtime-yellow'
                    : 'bg-white text-bedtime-purple-dark border-2 border-bedtime-purple-pale hover:border-bedtime-purple'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-3xl">{voice.icon}</span>
                  <div className="flex-1">
                    <h4 className="font-semibold mb-1">{voice.name}</h4>
                    <p className="text-xs opacity-90">{voice.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {voiceSelection === 'clone' && (
            <div className="mt-6 border-2 border-bedtime-purple-pale rounded-2xl p-6">
              {!isAuthenticated && (
                <div className="mb-4 p-4 bg-yellow-100 text-yellow-800 rounded-lg">
                  <p className="font-semibold mb-2">Login Required</p>
                  <p className="text-sm">You need to log in to clone and save your voice. You can still create stories with other voice options without logging in.</p>
                </div>
              )}

              {cloneSuccess && (
                <div className="mb-4 p-3 bg-green-100 text-green-800 rounded-lg">
                  {cloneSuccess}
                </div>
              )}

              {cloneError && (
                <div className="mb-4 p-3 bg-red-100 text-red-800 rounded-lg">
                  {cloneError}
                </div>
              )}

              {isAuthenticated && clonedVoices.length > 0 && (
                <div className="mb-4">
                  <label className="label-bedtime text-sm">Use Previously Cloned Voice</label>
                  <select
                    value={selectedClonedVoiceId || ''}
                    onChange={(e) => setSelectedClonedVoiceId(e.target.value || null)}
                    className="input-bedtime"
                    disabled={!isAuthenticated}
                  >
                    <option value="">Select a voice...</option>
                    {clonedVoices.map((voice) => (
                      <option key={voice.id} value={voice.voice_id}>
                        {voice.name} (created {new Date(voice.created_at).toLocaleDateString()})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {isAuthenticated && (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <label className="label-bedtime text-sm">
                      {clonedVoices.length > 0 ? 'Or Clone a New Voice' : 'Clone Your Voice'}
                    </label>
                    {!showVoiceRecorder && (
                      <button
                        type="button"
                        onClick={() => setShowVoiceRecorder(true)}
                        className="text-sm text-bedtime-purple hover:text-bedtime-purple-dark font-semibold"
                      >
                        + New Voice Clone
                      </button>
                    )}
                  </div>

                  {showVoiceRecorder && (
                    <VoiceRecorder onAudioReady={handleVoiceClone} isLoading={isCloning} />
                  )}
                </>
              )}
            </div>
          )}

          {errors.voice && (
            <p className="text-red-400 text-sm mt-2">{errors.voice}</p>
          )}
        </div>

        <div className="mb-4">
          <label className="label-bedtime">Recent Experience (Optional)</label>
          <input
            type="text"
            value={formData.context}
            onChange={(event) => {
              markCustom();
              setFormData((prev) => ({ ...prev, context: event.target.value }));
            }}
            className="input-bedtime"
            placeholder="e.g., started a new school, made a new friend..."
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="spinner"></span>
            Creating Story...
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <span>🌟</span>
            Start Bedtime Story
          </span>
        )}
      </button>
    </form>
  );
};
