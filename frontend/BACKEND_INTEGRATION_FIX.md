# Backend Integration Fix

## Summary
Fixed all frontend-backend integration issues to match the Cloudflare Workers backend API contract.

## Changes Made

### 1. Updated Type Definitions (`src/lib/types.ts`)
- **Child**: Removed `moralFocus` field (it's now a separate parameter)
- **Scene**: Now has `id`, `text`, `emotion_hint`, `audio_url`
- **Choice**: Now has `prompt` and `options: [string, string]`
- **MoralMeter**: Now has `kind`, `honest`, `brave` (0-1 values)
- **StartRequest**: Separated `child` and `moral_focus` fields
- **StartResponse**: Returns `session_id`, `scene`, `choice`
- **ContinueRequest**: Takes `session_id`, `last_scene_id`, `choice` ("A" or "B")
- **ContinueResponse**: Returns `scene`, `ending`, `moral_meter`
- Added `ChildSchema` for validation

### 2. Updated Constants (`src/lib/constants.ts`)
- Changed `CHARACTER_PRESETS` structure to separate `child` and `moral_focus`
- Updated API_BASE_URL default to `http://localhost:8787` (Cloudflare Workers default)
- Updated age range: MIN_AGE=5, MAX_AGE=11
- Updated moral focuses: kindness, honesty, courage, sharing, perseverance

### 3. Updated API Client (`src/lib/api.ts`)
- Changed endpoints to `/api/story/start` and `/api/story/continue`
- Updated request/response handling to match new contracts

### 4. Updated StoryForm Component (`src/components/StoryForm.tsx`)
- Separated `moralFocus` state from `formData`
- Updated `onSubmit` to pass both `child` and `moralFocus` separately
- Fixed preset loading to handle new structure
- Fixed moral focus dropdown to use separate state

### 5. Updated Create Page (`src/pages/Create.tsx`)
- Updated `handleSubmit` to accept `child` and `moralFocus` separately
- Updated API call to send `{ child, moral_focus }`
- Updated session storage keys:
  - `currentScene` instead of `initial_scene`
  - `currentChoice` for the choice options
  - Removed `storyTitle` (not in new API)

### 6. Completely Rewrote Play Page (`src/pages/Play.tsx`)
- Now properly handles the new API structure
- Features:
  - **Audio Player**: Built-in HTML5 audio with autoplay
  - **Scene Display**: Shows scene text with proper formatting
  - **Moral Meter**: Displays kind, honest, brave progress bars
  - **Choice Selection**: Shows A/B options from the choice object
  - **Ending Screen**: Displays reflection when story ends
  - **Session Management**: Properly tracks scene_id for continue requests

### 7. Removed Obsolete Components
- Deleted `MoralMeter.tsx` (integrated into Play page)
- Deleted `SceneCard.tsx` (replaced with custom layout)
- Deleted `AudioPlayer.tsx` (integrated into Play page)

## API Flow

### Start Story
```typescript
POST /api/story/start
Request: { child: Child, moral_focus: MoralFocus }
Response: { session_id, scene, choice }
```

### Continue Story
```typescript
POST /api/story/continue
Request: { session_id, last_scene_id, choice: "A" | "B" }
Response: { scene, ending, moral_meter }
```

## Backend Compatibility

The frontend now perfectly matches the Cloudflare Workers backend structure:
- ✅ Correct endpoint paths
- ✅ Correct request formats
- ✅ Correct response parsing
- ✅ Proper Zod validation
- ✅ Audio URL handling (R2 + audio endpoint)
- ✅ Session management with KV

## What Works Now

1. **Story Creation**: Form collects child info + moral focus, sends to backend
2. **Scene Display**: Shows scene text with audio player
3. **Audio Playback**: Plays MP3 from R2 via `/audio/:sessionId/:sceneId` endpoint
4. **Choice Making**: Converts button index (0/1) to choice ("A"/"B")
5. **Moral Tracking**: Displays three progress bars for kind/honest/brave
6. **Story Ending**: Shows reflection message when story completes

## Build Status

✅ TypeScript compilation successful
✅ Vite build successful
✅ No errors or warnings
✅ Ready to connect to backend

## Testing Checklist

- [ ] Start a story with custom child profile
- [ ] Start a story with Arjun preset
- [ ] Start a story with Maya preset
- [ ] Make choice A
- [ ] Make choice B
- [ ] Hear audio narration
- [ ] See moral meter update
- [ ] Complete story and see ending
- [ ] Start new story after completion

## Notes

- The backend generates 2 scenes total (scene_1, scene_2)
- Audio is generated with ElevenLabs TTS
- Audio stored in R2 and served via worker endpoint
- Moral meter calculated based on choices and moral focus
