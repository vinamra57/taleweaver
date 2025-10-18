import { Scene, Choice } from '../lib/types';
import { MoralMeter } from './MoralMeter';
import { AudioPlayer } from './AudioPlayer';

interface SceneCardProps {
  scene: Scene;
  onChoiceSelect: (choiceIndex: number) => void;
  isLoading?: boolean;
}

export const SceneCard: React.FC<SceneCardProps> = ({
  scene,
  onChoiceSelect,
  isLoading = false,
}) => {
  return (
    <div className="space-y-6">
      {/* Scene narrative */}
      <div className="bedtime-card stars-bg">
        <div className="flex items-start gap-3 mb-4">
          <span className="text-3xl">📖</span>
          <h3 className="text-2xl text-bedtime-yellow">
            Scene {scene.scene_number}
          </h3>
        </div>

        <div className="narrative-text mb-6 whitespace-pre-wrap">
          {scene.narrative}
        </div>

        {/* Image placeholder */}
        {scene.image_prompt && (
          <div className="w-full h-48 bg-bedtime-blue-midnight/50 rounded-xl flex items-center justify-center border-2 border-bedtime-purple-light/30">
            <div className="text-center">
              <div className="text-4xl mb-2">🎨</div>
              <p className="text-sm text-bedtime-cream/50">
                Image coming soon!
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Audio player */}
      {scene.audio_prompt && <AudioPlayer audioPrompt={scene.audio_prompt} />}

      {/* Moral meter */}
      {scene.moral_meter && <MoralMeter moralMeter={scene.moral_meter} />}

      {/* Choices */}
      <div className="bedtime-card">
        <h4 className="text-xl text-bedtime-yellow mb-4 flex items-center gap-2">
          <span>🤔</span>
          <span>What should happen next?</span>
        </h4>

        <div className="space-y-3">
          {scene.choices.map((choice: Choice, index: number) => (
            <button
              key={index}
              onClick={() => onChoiceSelect(index)}
              disabled={isLoading}
              className="btn-choice disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl flex-shrink-0">
                  {index === 0 ? '🅰️' : index === 1 ? '🅱️' : '🅲'}
                </span>
                <div className="text-left flex-1">
                  <p className="mb-1">{choice.text}</p>
                  <p className="text-sm text-bedtime-yellow/70 italic">
                    {choice.consequence_hint}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
