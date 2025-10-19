import { useMemo, useState } from 'react';
import {
  SONG_TYPES,
  SONG_THEMES,
  SONG_LENGTHS,
  MUSICAL_STYLES,
  MORAL_FOCI,
  VOICE_OPTIONS,
  DEFAULT_MORAL_FOCUS,
} from '../lib/constants';
import type {
  SongRequest,
  SongType,
  SongTheme,
  SongLength,
  MusicalStyle,
  MoralFocus,
  VoiceSelection,
} from '../lib/types';

interface SongFormProps {
  onSubmit: (request: SongRequest) => void;
  isLoading?: boolean;
}

type FormErrors = Partial<Record<keyof SongRequest, string>>;

const pillClasses = (selected: boolean) =>
  selected
    ? 'px-4 py-2 rounded-full text-sm font-semibold bg-bedtime-yellow text-white shadow-md transition-all'
    : 'px-4 py-2 rounded-full text-sm font-semibold bg-white text-bedtime-purple-dark border-2 border-bedtime-purple-pale hover:border-bedtime-purple transition-all';

const toggleClasses = (selected: boolean) =>
  selected
    ? 'px-4 py-3 rounded-2xl font-semibold bg-bedtime-purple text-white shadow-md transition-all'
    : 'px-4 py-3 rounded-2xl font-semibold bg-white text-bedtime-purple-dark border-2 border-bedtime-purple-pale hover:border-bedtime-purple transition-all';

export const SongForm: React.FC<SongFormProps> = ({ onSubmit, isLoading = false }) => {
  const [childName, setChildName] = useState('');
  const [songType, setSongType] = useState<SongType>('song');
  const [theme, setTheme] = useState<SongTheme>('bedtime');
  const [moralFocus, setMoralFocus] = useState<MoralFocus>(DEFAULT_MORAL_FOCUS);
  const [songLength, setSongLength] = useState<SongLength>(60);
  const [voiceSelection, setVoiceSelection] = useState<VoiceSelection>('custom');
  const [musicalStyle, setMusicalStyle] = useState<MusicalStyle>('lullaby');
  const [errors, setErrors] = useState<FormErrors>({});

  const moralFocusDescription = useMemo(() => {
    switch (moralFocus) {
      case 'kindness':
        return 'Gentle reminders about being kind and caring.';
      case 'honesty':
        return 'Encourage truthfulness and integrity.';
      case 'courage':
        return 'Inspire bravery in new situations.';
      case 'sharing':
        return 'Celebrate generosity with friends and family.';
      case 'perseverance':
        return 'Motivate them to keep trying and never give up.';
      default:
        return '';
    }
  }, [moralFocus]);

  const submitForm = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = childName.trim();

    if (!trimmedName) {
      setErrors({ child_name: 'Please enter a name to personalize the song.' });
      return;
    }

    setErrors({});

    const payload: SongRequest = {
      child_name: trimmedName,
      song_type: songType,
      theme,
      moral_focus: moralFocus,
      song_length: songLength,
      voice_selection: voiceSelection,
      musical_style: musicalStyle,
    };

    onSubmit(payload);
  };

  return (
    <form onSubmit={submitForm} className="bedtime-card max-w-4xl mx-auto">
      <div className="space-y-10">
        {/* Child name */}
        <section>
          <h2 className="text-2xl font-display text-bedtime-purple mb-3">
            Who is this song for?
          </h2>
          <p className="text-bedtime-purple-dark/80 font-body mb-4">
            We&apos;ll weave their name into the lyrics to make it extra special.
          </p>
          <input
            type="text"
            value={childName}
            onChange={(event) => {
              setChildName(event.target.value);
              if (errors.child_name) {
                setErrors((prev) => ({ ...prev, child_name: undefined }));
              }
            }}
            placeholder="Child's name"
            className={`w-full px-4 py-3 rounded-2xl border-2 bg-white font-body text-lg transition-all focus:outline-none focus:ring-2 focus:ring-bedtime-purple ${
              errors.child_name ? 'border-red-400' : 'border-bedtime-purple-pale'
            }`}
          />
          {errors.child_name && (
            <p className="text-red-500 text-sm mt-2">{errors.child_name}</p>
          )}
        </section>

        {/* Song type */}
        <section>
          <h2 className="text-2xl font-display text-bedtime-purple mb-3">Song style</h2>
          <p className="text-bedtime-purple-dark/80 font-body mb-4">
            Choose the kind of musical experience you want to create.
          </p>
          <div className="flex flex-wrap gap-3">
            {SONG_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                className={toggleClasses(songType === type)}
                onClick={() => setSongType(type)}
              >
                {type === 'song' && 'Full Song'}
                {type === 'rhyme' && 'Nursery Rhyme'}
                {type === 'instrumental' && 'Instrumental'}
              </button>
            ))}
          </div>
        </section>

        {/* Theme */}
        <section>
          <h2 className="text-2xl font-display text-bedtime-purple mb-3">Theme</h2>
          <p className="text-bedtime-purple-dark/80 font-body mb-4">
            We&apos;ll tailor the mood and story around your chosen theme.
          </p>
          <div className="flex flex-wrap gap-3">
            {SONG_THEMES.map((option) => (
              <button
                key={option}
                type="button"
                className={pillClasses(theme === option)}
                onClick={() => setTheme(option)}
              >
                {option.charAt(0).toUpperCase() + option.slice(1)}
              </button>
            ))}
          </div>
        </section>

        {/* Moral focus */}
        <section>
          <h2 className="text-2xl font-display text-bedtime-purple mb-3">Lesson to share</h2>
          <p className="text-bedtime-purple-dark/80 font-body mb-4">
            Reinforce a meaningful value through the lyrics.
          </p>
          <div className="flex flex-wrap gap-3 mb-3">
            {MORAL_FOCI.map((focus) => (
              <button
                key={focus}
                type="button"
                className={pillClasses(moralFocus === focus)}
                onClick={() => setMoralFocus(focus)}
              >
                {focus.charAt(0).toUpperCase() + focus.slice(1)}
              </button>
            ))}
          </div>
          <p className="text-sm text-bedtime-purple-dark/70 font-body">
            {moralFocusDescription}
          </p>
        </section>

        {/* Musical style */}
        <section>
          <h2 className="text-2xl font-display text-bedtime-purple mb-3">Musical style</h2>
          <p className="text-bedtime-purple-dark/80 font-body mb-4">
            Pick the instruments and vibe that match your child&apos;s taste.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {MUSICAL_STYLES.map((style) => (
              <button
                key={style}
                type="button"
                className={toggleClasses(musicalStyle === style)}
                onClick={() => setMusicalStyle(style)}
              >
                {style.charAt(0).toUpperCase() + style.slice(1)}
              </button>
            ))}
          </div>
        </section>

        {/* Song length */}
        <section>
          <h2 className="text-2xl font-display text-bedtime-purple mb-3">Duration</h2>
          <p className="text-bedtime-purple-dark/80 font-body mb-4">
            Choose how long the song should be.
          </p>
          <div className="flex flex-wrap gap-3">
            {SONG_LENGTHS.map((length) => (
              <button
                key={length}
                type="button"
                className={pillClasses(songLength === length)}
                onClick={() => setSongLength(length)}
              >
                {length === 30 ? '30 seconds' : `${length / 60} minute${length >= 120 ? 's' : ''}`}
              </button>
            ))}
          </div>
        </section>

        {/* Voice selection */}
        <section>
          <h2 className="text-2xl font-display text-bedtime-purple mb-3">Vocal style</h2>
          <p className="text-bedtime-purple-dark/80 font-body mb-4">
            We&apos;ll guide the AI to sing using this tone (ignored for instrumentals).
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            {VOICE_OPTIONS.map((voice) => (
              <button
                key={voice.id}
                type="button"
                className={`rounded-2xl border-2 p-4 text-left transition-all ${
                  voiceSelection === voice.id
                    ? 'border-bedtime-purple bg-bedtime-purple/10 shadow-lg'
                    : 'border-bedtime-purple-pale bg-white hover:border-bedtime-purple'
                }`}
                onClick={() => setVoiceSelection(voice.id)}
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">{voice.icon}</span>
                  <span className="font-semibold text-bedtime-purple">{voice.name}</span>
                </div>
                <p className="text-sm text-bedtime-purple-dark/80">{voice.description}</p>
              </button>
            ))}
          </div>
        </section>

        {/* Submit */}
        <section className="text-center">
          <button
            type="submit"
            className="btn-primary text-lg px-8 py-3"
            disabled={isLoading}
          >
            {isLoading ? 'Creating song...' : 'Create Song'}
          </button>
        </section>
      </div>
    </form>
  );
};
