# EmpathAI Frontend - Recent Updates

## New Landing Page

A beautiful landing page has been added at the root path `/` with the following features:

### Features:
- **Hero Section**: Large EmpathAI branding with floating emoji animations
- **Feature Cards**: Three key benefits (Personalized, Educational, Interactive)
- **How It Works**: Step-by-step guide for parents
- **Sample Characters**: Quick-start buttons for Arjun and Maya presets
- **Call-to-Action**: Prominent "Start Your Story" button

### Navigation Flow:
1. **Home** (`/`) - Landing page
2. **Create** (`/create`) - Story creation form
3. **Play** (`/play`) - Interactive story playback

### New Features:

#### URL Preset Support
You can now link directly to character presets:
- `/create?preset=arjun` - Loads Arjun's profile
- `/create?preset=maya` - Loads Maya's profile

#### Navigation Improvements
- All pages have navigation back to home
- EmpathAI logo is clickable throughout the app
- "Back to Home" link on create page
- "Start New Story" button on play page clears session and returns home

### Files Modified:
- `src/pages/Home.tsx` - NEW: Landing page component
- `src/App.tsx` - Updated routing (/, /create, /play)
- `src/pages/Create.tsx` - Added preset support and navigation
- `src/pages/Play.tsx` - Added home navigation
- `src/components/StoryForm.tsx` - Added preset key prop support

### Visual Design:
- Consistent bedtime theme throughout
- Twinkling stars background on all pages
- Moon decoration element
- Smooth hover animations
- Child-friendly Comic Sans font
- Purple/blue gradient backgrounds with yellow accents

## Quick Start

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

Visit `http://localhost:5173/` to see the landing page!
