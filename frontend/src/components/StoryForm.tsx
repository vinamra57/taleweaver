import { useState, useEffect } from 'react';
import { Child, ChildSchema } from '../lib/types';
import { CHARACTER_PRESETS, COMMON_INTERESTS, MORAL_FOCUSES, MIN_AGE, MAX_AGE } from '../lib/constants';

interface StoryFormProps {
  onSubmit: (child: Child) => void;
  isLoading?: boolean;
  presetKey?: string | null;
}

export const StoryForm: React.FC<StoryFormProps> = ({ onSubmit, isLoading = false, presetKey = null }) => {
  const [formData, setFormData] = useState<Partial<Child>>({
    name: '',
    age: 7,
    interests: [],
    context: '',
    moralFocus: 'kindness',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [customInterest, setCustomInterest] = useState('');

  // Load preset if provided via URL
  useEffect(() => {
    if (presetKey && CHARACTER_PRESETS[presetKey]) {
      const preset = CHARACTER_PRESETS[presetKey];
      setFormData(preset);
      setErrors({});
    }
  }, [presetKey]);

  const handleLoadPreset = (presetKey: string) => {
    const preset = CHARACTER_PRESETS[presetKey];
    setFormData(preset);
    setErrors({});
  };

  const handleInterestToggle = (interest: string) => {
    const current = formData.interests || [];
    if (current.includes(interest)) {
      setFormData({
        ...formData,
        interests: current.filter((i) => i !== interest),
      });
    } else {
      setFormData({
        ...formData,
        interests: [...current, interest],
      });
    }
  };

  const handleAddCustomInterest = () => {
    if (customInterest.trim()) {
      const current = formData.interests || [];
      if (!current.includes(customInterest.trim())) {
        setFormData({
          ...formData,
          interests: [...current, customInterest.trim()],
        });
      }
      setCustomInterest('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    try {
      const validated = ChildSchema.parse(formData);
      onSubmit(validated);
    } catch (error: any) {
      const newErrors: Record<string, string> = {};
      if (error.errors) {
        error.errors.forEach((err: any) => {
          newErrors[err.path[0]] = err.message;
        });
      }
      setErrors(newErrors);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Preset characters */}
      <div className="bedtime-card">
        <h3 className="bedtime-card-header">
          <span className="star">⭐</span>
          <span>Quick Start Characters</span>
        </h3>
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => handleLoadPreset('arjun')}
            className="btn-secondary flex-1"
          >
            Arjun (8)
          </button>
          <button
            type="button"
            onClick={() => handleLoadPreset('maya')}
            className="btn-secondary flex-1"
          >
            Maya (7)
          </button>
        </div>
      </div>

      {/* Custom character form */}
      <div className="bedtime-card">
        <h3 className="bedtime-card-header">
          <span className="star">✨</span>
          <span>Create Your Character</span>
        </h3>

        {/* Name */}
        <div className="mb-4">
          <label className="label-bedtime">Child's Name</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="input-bedtime"
            placeholder="Enter name..."
          />
          {errors.name && (
            <p className="text-red-400 text-sm mt-1">{errors.name}</p>
          )}
        </div>

        {/* Age */}
        <div className="mb-4">
          <label className="label-bedtime">Age</label>
          <input
            type="number"
            min={MIN_AGE}
            max={MAX_AGE}
            value={formData.age}
            onChange={(e) => setFormData({ ...formData, age: parseInt(e.target.value) })}
            className="input-bedtime"
          />
          {errors.age && (
            <p className="text-red-400 text-sm mt-1">{errors.age}</p>
          )}
        </div>

        {/* Interests */}
        <div className="mb-4">
          <label className="label-bedtime">Interests</label>
          <div className="flex flex-wrap gap-2 mb-3">
            {COMMON_INTERESTS.map((interest) => (
              <button
                key={interest}
                type="button"
                onClick={() => handleInterestToggle(interest)}
                className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${
                  formData.interests?.includes(interest)
                    ? 'bg-bedtime-yellow text-bedtime-purple-dark'
                    : 'bg-bedtime-blue-midnight/50 text-bedtime-cream border border-bedtime-purple-light/50'
                }`}
              >
                {interest}
              </button>
            ))}
          </div>

          {/* Custom interest */}
          <div className="flex gap-2">
            <input
              type="text"
              value={customInterest}
              onChange={(e) => setCustomInterest(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCustomInterest())}
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

          {/* Selected custom interests */}
          {formData.interests?.filter(i => !COMMON_INTERESTS.includes(i as any)).map((interest) => (
            <div
              key={interest}
              className="inline-block bg-bedtime-yellow text-bedtime-purple-dark px-4 py-2 rounded-full text-sm font-bold mr-2 mt-2"
            >
              {interest}
              <button
                type="button"
                onClick={() => handleInterestToggle(interest)}
                className="ml-2"
              >
                ✕
              </button>
            </div>
          ))}

          {errors.interests && (
            <p className="text-red-400 text-sm mt-1">{errors.interests}</p>
          )}
        </div>

        {/* Context */}
        <div className="mb-4">
          <label className="label-bedtime">
            Recent Experience (Optional)
          </label>
          <input
            type="text"
            value={formData.context}
            onChange={(e) => setFormData({ ...formData, context: e.target.value })}
            className="input-bedtime"
            placeholder="e.g., started a new school, made a new friend..."
          />
        </div>

        {/* Moral Focus */}
        <div className="mb-4">
          <label className="label-bedtime">What should the story teach?</label>
          <select
            value={formData.moralFocus}
            onChange={(e) => setFormData({ ...formData, moralFocus: e.target.value })}
            className="input-bedtime"
          >
            {MORAL_FOCUSES.map((moral) => (
              <option key={moral} value={moral}>
                {moral.charAt(0).toUpperCase() + moral.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Submit button */}
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
