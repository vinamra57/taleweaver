# TaleWeaver Frontend

A React TypeScript application for creating personalized, educational bedtime stories for children.

## Features

- **Personalized Stories**: Create stories tailored to a child's age, interests, and recent experiences
- **Interactive Choices**: Children can make decisions that affect the story's direction
- **Moral Learning**: Stories focus on teaching important values like honesty, kindness, and empathy
- **Beautiful Bedtime Theme**: Soft colors and child-friendly design perfect for bedtime
- **Character Presets**: Quick-start with pre-configured characters (Arjun and Maya)

## Tech Stack

- **React 18** with TypeScript
- **React Router** for navigation
- **Tailwind CSS** for styling with custom bedtime theme
- **Axios** for API calls
- **Zod** for runtime validation
- **Vite** for build tooling
- **Cloudflare Pages** for deployment

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file from the example:
```bash
cp .env.example .env
```

3. Update the `.env` file with your API URL:
```
VITE_API_BASE_URL=http://localhost:8000
```

### Development

Start the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### Build

Build for production:
```bash
npm run build
```

Preview the production build:
```bash
npm run preview
```

## Deployment to Cloudflare Pages

### Option 1: Using Wrangler CLI

1. Install Wrangler:
```bash
npm install -g wrangler
```

2. Login to Cloudflare:
```bash
wrangler login
```

3. Deploy:
```bash
npm run pages:deploy
```

### Option 2: Using Cloudflare Dashboard

1. Build the project:
```bash
npm run build
```

2. Go to Cloudflare Pages dashboard
3. Create a new project
4. Upload the `dist` folder
5. Set environment variable `VITE_API_BASE_URL` to your production API URL

## Project Structure

```
frontend/
├── src/
│   ├── components/       # React components
│   │   ├── AudioPlayer.tsx
│   │   ├── LoadingStates.tsx
│   │   ├── MoralMeter.tsx
│   │   ├── SceneCard.tsx
│   │   └── StoryForm.tsx
│   ├── pages/           # Page components
│   │   ├── Create.tsx
│   │   └── Play.tsx
│   ├── lib/             # Utilities and types
│   │   ├── api.ts       # API client
│   │   ├── constants.ts # Constants and presets
│   │   └── types.ts     # TypeScript types
│   ├── styles/          # CSS styles
│   │   └── globals.css
│   ├── App.tsx          # Main app component
│   └── index.tsx        # Entry point
├── index.html
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

## Character Presets

### Arjun
- Age: 8
- Interests: sports, jungle, monkeys
- Context: took shortcut in game
- Moral Focus: honesty

### Maya
- Age: 7
- Interests: space, stars, drawing
- Context: starting new school
- Moral Focus: kindness

## Customization

### Theme Colors

The bedtime theme uses custom colors defined in `tailwind.config.js`:
- Purple tones for backgrounds
- Soft blues for depth
- Warm yellows for accents (stars, moon)
- Cream colors for text

### Adding New Presets

Edit `src/lib/constants.ts` to add new character presets:

```typescript
export const CHARACTER_PRESETS = {
  // ... existing presets
  yourCharacter: {
    name: 'Character Name',
    age: 7,
    interests: ['interest1', 'interest2'],
    context: 'recent experience',
    moralFocus: 'honesty',
  },
};
```

## API Integration

The app expects the following API endpoints:

- `POST /start` - Start a new story
- `POST /continue` - Continue the story with a choice

See `src/lib/types.ts` for request/response schemas.

## License

MIT
