export const DinoIllustration: React.FC<{ className?: string }> = ({ className = "w-64 h-64" }) => (
  <svg className={className} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Cute Dinosaur */}
    <g>
      {/* Body */}
      <ellipse cx="100" cy="120" rx="60" ry="45" fill="#B8D4B8" />
      {/* Head */}
      <circle cx="140" cy="90" r="35" fill="#B8D4B8" />
      {/* Spikes */}
      <path d="M70 95 L75 75 L80 95" fill="#9DAECC" />
      <path d="M80 90 L85 70 L90 90" fill="#9DAECC" />
      <path d="M90 88 L95 68 L100 88" fill="#9DAECC" />
      {/* Tail */}
      <path d="M40 120 Q20 110 30 95" stroke="#B8D4B8" strokeWidth="20" fill="none" strokeLinecap="round" />
      {/* Legs */}
      <rect x="70" y="150" width="15" height="30" rx="7" fill="#9DAECC" />
      <rect x="110" y="150" width="15" height="30" rx="7" fill="#9DAECC" />
      {/* Eye */}
      <circle cx="150" cy="85" r="5" fill="#5D4E7A" />
      {/* Smile */}
      <path d="M145 100 Q150 105 155 100" stroke="#5D4E7A" strokeWidth="2" fill="none" />
    </g>
  </svg>
);

export const RocketIllustration: React.FC<{ className?: string }> = ({ className = "w-64 h-64" }) => (
  <svg className={className} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Rocket */}
    <g>
      {/* Body */}
      <rect x="80" y="60" width="40" height="80" rx="20" fill="#9DAECC" />
      {/* Window */}
      <circle cx="100" cy="90" r="12" fill="#C8D6E8" stroke="#5D4E7A" strokeWidth="2" />
      {/* Nose */}
      <path d="M80 60 L100 20 L120 60" fill="#F9C97C" />
      {/* Wings */}
      <path d="M80 100 L50 130 L80 130" fill="#B4A5D5" />
      <path d="M120 100 L150 130 L120 130" fill="#B4A5D5" />
      {/* Fire */}
      <ellipse cx="100" cy="145" rx="15" ry="10" fill="#FFD56B" />
      <ellipse cx="100" cy="155" rx="12" ry="8" fill="#F9C97C" />
      <ellipse cx="100" cy="162" rx="8" ry="6" fill="#FFDDA1" />
      {/* Stars */}
      <circle cx="40" cy="40" r="3" fill="#FFD56B" />
      <circle cx="160" cy="50" r="2" fill="#FFD56B" />
      <circle cx="150" cy="160" r="3" fill="#FFD56B" />
    </g>
  </svg>
);

export const CloudIllustration: React.FC<{ className?: string }> = ({ className = "w-48 h-32" }) => (
  <svg className={className} viewBox="0 0 200 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Cloud */}
    <g>
      <ellipse cx="100" cy="60" rx="50" ry="30" fill="white" opacity="0.9" />
      <circle cx="70" cy="55" r="25" fill="white" opacity="0.9" />
      <circle cx="130" cy="55" r="25" fill="white" opacity="0.9" />
      <circle cx="100" cy="45" r="20" fill="white" opacity="0.9" />
    </g>
  </svg>
);

export const StarIllustration: React.FC<{ className?: string; color?: string }> = ({
  className = "w-12 h-12",
  color = "#FFD56B"
}) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
      fill={color}
    />
  </svg>
);

export const BookIllustration: React.FC<{ className?: string }> = ({ className = "w-64 h-64" }) => (
  <svg className={className} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Open Book */}
    <g>
      {/* Left page */}
      <path d="M40 60 L40 160 L95 150 L95 50 Z" fill="white" stroke="#B4A5D5" strokeWidth="2" />
      {/* Right page */}
      <path d="M160 60 L160 160 L105 150 L105 50 Z" fill="white" stroke="#B4A5D5" strokeWidth="2" />
      {/* Spine shadow */}
      <rect x="95" y="50" width="10" height="110" fill="#D5CAED" />
      {/* Text lines left */}
      <line x1="50" y1="70" x2="85" y2="70" stroke="#9DAECC" strokeWidth="2" />
      <line x1="50" y1="85" x2="85" y2="85" stroke="#9DAECC" strokeWidth="2" />
      <line x1="50" y1="100" x2="80" y2="100" stroke="#9DAECC" strokeWidth="2" />
      {/* Text lines right */}
      <line x1="115" y1="70" x2="150" y2="70" stroke="#9DAECC" strokeWidth="2" />
      <line x1="115" y1="85" x2="150" y2="85" stroke="#9DAECC" strokeWidth="2" />
      <line x1="115" y1="100" x2="145" y2="100" stroke="#9DAECC" strokeWidth="2" />
      {/* Little star decoration */}
      <circle cx="70" cy="130" r="3" fill="#F9C97C" />
      <circle cx="130" cy="130" r="3" fill="#F9C97C" />
    </g>
  </svg>
);

export const MoonIllustration: React.FC<{ className?: string }> = ({ className = "w-32 h-32" }) => (
  <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Crescent Moon */}
    <g>
      <circle cx="50" cy="50" r="35" fill="#FFE8B8" />
      <circle cx="60" cy="45" r="30" fill="#D5CAED" />
      {/* Crater */}
      <circle cx="40" cy="45" r="5" fill="#FFDDA1" opacity="0.6" />
      <circle cx="45" cy="60" r="4" fill="#FFDDA1" opacity="0.6" />
    </g>
  </svg>
);

export const HeartIllustration: React.FC<{ className?: string }> = ({ className = "w-16 h-16" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
      fill="#F5C6D8"
    />
  </svg>
);

export const TeddyBearIllustration: React.FC<{ className?: string }> = ({ className = "w-24 h-24" }) => (
  <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Teddy Bear */}
    <g>
      {/* Ears */}
      <circle cx="30" cy="25" r="12" fill="#D5CAED" />
      <circle cx="70" cy="25" r="12" fill="#D5CAED" />
      {/* Head */}
      <circle cx="50" cy="40" r="22" fill="#C8D6E8" />
      {/* Snout */}
      <ellipse cx="50" cy="45" rx="12" ry="10" fill="#F5E6D3" />
      {/* Nose */}
      <circle cx="50" cy="45" r="4" fill="#8B7AB8" />
      {/* Eyes */}
      <circle cx="42" cy="35" r="3" fill="#5D4E7A" />
      <circle cx="58" cy="35" r="3" fill="#5D4E7A" />
      {/* Body */}
      <ellipse cx="50" cy="75" rx="20" ry="18" fill="#C8D6E8" />
      {/* Belly */}
      <ellipse cx="50" cy="75" rx="12" ry="10" fill="#F5E6D3" />
      {/* Arms */}
      <ellipse cx="32" cy="70" rx="8" ry="12" fill="#C8D6E8" />
      <ellipse cx="68" cy="70" rx="8" ry="12" fill="#C8D6E8" />
    </g>
  </svg>
);

export const BallIllustration: React.FC<{ className?: string }> = ({ className = "w-16 h-16" }) => (
  <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Ball */}
    <circle cx="50" cy="50" r="35" fill="#FFDDA1" />
    <circle cx="50" cy="50" r="35" fill="#F9C97C" opacity="0.5" />
    <path d="M25 35 Q50 30 75 35" stroke="#FFD56B" strokeWidth="3" fill="none" />
    <path d="M25 50 Q50 45 75 50" stroke="#FFD56B" strokeWidth="3" fill="none" />
    <path d="M25 65 Q50 60 75 65" stroke="#FFD56B" strokeWidth="3" fill="none" />
  </svg>
);

export const BuildingBlockIllustration: React.FC<{ className?: string }> = ({ className = "w-20 h-20" }) => (
  <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Building Block */}
    <g>
      <rect x="20" y="30" width="60" height="50" rx="4" fill="#B4A5D5" />
      <rect x="25" y="35" width="50" height="40" rx="2" fill="#D5CAED" />
      {/* Studs */}
      <circle cx="40" cy="50" r="5" fill="#8B7AB8" />
      <circle cx="60" cy="50" r="5" fill="#8B7AB8" />
      <circle cx="40" cy="65" r="5" fill="#8B7AB8" />
      <circle cx="60" cy="65" r="5" fill="#8B7AB8" />
    </g>
  </svg>
);

export const CarIllustration: React.FC<{ className?: string }> = ({ className = "w-24 h-24" }) => (
  <svg className={className} viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Toy Car */}
    <g>
      {/* Body */}
      <rect x="20" y="35" width="80" height="25" rx="8" fill="#9DAECC" />
      {/* Cabin */}
      <path d="M35 35 L35 20 Q40 15 60 15 Q80 15 85 20 L85 35" fill="#C8D6E8" />
      {/* Windows */}
      <rect x="40" y="20" width="15" height="12" rx="2" fill="#D5CAED" opacity="0.7" />
      <rect x="65" y="20" width="15" height="12" rx="2" fill="#D5CAED" opacity="0.7" />
      {/* Wheels */}
      <circle cx="35" cy="60" r="12" fill="#5D4E7A" />
      <circle cx="35" cy="60" r="7" fill="#8B7AB8" />
      <circle cx="85" cy="60" r="12" fill="#5D4E7A" />
      <circle cx="85" cy="60" r="7" fill="#8B7AB8" />
    </g>
  </svg>
);

export const SmallDinoIllustration: React.FC<{ className?: string }> = ({ className = "w-20 h-20" }) => (
  <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Small Cute Dino */}
    <g>
      {/* Body */}
      <ellipse cx="50" cy="60" rx="25" ry="20" fill="#B8D4B8" />
      {/* Head */}
      <circle cx="65" cy="45" r="15" fill="#B8D4B8" />
      {/* Spikes */}
      <path d="M40 50 L42 40 L44 50" fill="#9DAECC" />
      <path d="M45 48 L47 38 L49 48" fill="#9DAECC" />
      {/* Tail */}
      <path d="M25 60 Q15 55 20 48" stroke="#B8D4B8" strokeWidth="8" fill="none" strokeLinecap="round" />
      {/* Legs */}
      <rect x="40" y="75" width="6" height="12" rx="3" fill="#9DAECC" />
      <rect x="54" y="75" width="6" height="12" rx="3" fill="#9DAECC" />
      {/* Eye */}
      <circle cx="70" cy="43" r="2" fill="#5D4E7A" />
    </g>
  </svg>
);

export const ButterflyIllustration: React.FC<{ className?: string }> = ({ className = "w-16 h-16" }) => (
  <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Butterfly */}
    <g>
      {/* Wings */}
      <ellipse cx="35" cy="40" rx="15" ry="20" fill="#FFDEE8" />
      <ellipse cx="65" cy="40" rx="15" ry="20" fill="#FFDEE8" />
      <ellipse cx="35" cy="65" rx="12" ry="15" fill="#F5C6D8" />
      <ellipse cx="65" cy="65" rx="12" ry="15" fill="#F5C6D8" />
      {/* Body */}
      <ellipse cx="50" cy="50" rx="5" ry="25" fill="#8B7AB8" />
      {/* Antennae */}
      <path d="M48 30 Q45 20 42 15" stroke="#8B7AB8" strokeWidth="2" fill="none" />
      <path d="M52 30 Q55 20 58 15" stroke="#8B7AB8" strokeWidth="2" fill="none" />
    </g>
  </svg>
);
