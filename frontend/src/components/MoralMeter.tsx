import { MoralMeter as MoralMeterType } from '../lib/types';

interface MoralMeterProps {
  moralMeter: MoralMeterType;
}

export const MoralMeter: React.FC<MoralMeterProps> = ({ moralMeter }) => {
  const { focus, score, explanation } = moralMeter;

  return (
    <div className="bedtime-card">
      <div className="bedtime-card-header">
        <span className="star">⭐</span>
        <span>Growing in {focus}</span>
      </div>

      <div className="moral-meter-bar mb-3">
        <div
          className="moral-meter-fill"
          style={{ width: `${score}%` }}
        />
      </div>

      <div className="flex justify-between text-sm mb-2">
        <span className="text-bedtime-cream/70">Learning</span>
        <span className="text-bedtime-yellow font-bold">{score}%</span>
        <span className="text-bedtime-cream/70">Mastered</span>
      </div>

      <p className="text-bedtime-cream-warm text-sm italic">
        {explanation}
      </p>
    </div>
  );
};
