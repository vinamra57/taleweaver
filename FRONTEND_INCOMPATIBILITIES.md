# Frontend-Backend API Incompatibilities

**Critical**: The frontend and backend have **completely different API contracts**. This document details all incompatibilities that the frontend team must fix.

---

## 🚨 Summary

The backend was built according to the hackathon spec. The frontend was built with a different schema. **These are NOT compatible and will cause runtime failures.**

### Quick Stats
- **Incompatible Endpoints**: 2 of 2 (100%)
- **Schema Mismatches**: 8 major differences
- **Risk Level**: 🔴 **CRITICAL** - App will not work

---

## API Endpoint Differences

### ❌ INCOMPATIBLE: Endpoint Paths

| What | Backend (Ours) | Frontend (Theirs) | Status |
|------|---------------|------------------|--------|
| Start endpoint | `/api/story/start` | `/start` | ❌ Mismatch |
| Continue endpoint | `/api/story/continue` | `/continue` | ❌ Mismatch |
| Base URL | `http://localhost:8787` | `http://localhost:8000` | ❌ Mismatch |

**Fix Required**: Frontend must update endpoints to include `/api/story` prefix.

```diff
// frontend/src/lib/api.ts
- const response = await apiClient.post<StartResponse>('/start', request);
+ const response = await apiClient.post<StartResponse>('/api/story/start', request);

- const response = await apiClient.post<ContinueResponse>('/continue', request);
+ const response = await apiClient.post<ContinueResponse>('/api/story/continue', request);
```

```diff
// frontend/src/lib/constants.ts
- export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
+ export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787';
```

---

## 1. POST /api/story/start - Request Schema

### ✅ COMPATIBLE: Child Object

This part is mostly compatible:

| Field | Backend | Frontend | Compatible? |
|-------|---------|----------|-------------|
| `name` | `string` | `string` | ✅ Yes |
| `age` | `5-11` | `3-12` | ⚠️  Range different |
| `interests` | `string[]` (max 5) | `string[]` (min 1) | ⚠️  Validation different |
| `context` | `string?` (max 120) | `string?` | ✅ Yes |

### ❌ INCOMPATIBLE: Moral Focus Field Name

| What | Backend | Frontend |
|------|---------|----------|
| Field name | `moral_focus` | `moralFocus` (in Child object) |
| Location | Top-level | Inside `child` object |

**Backend expects:**
```typescript
{
  child: {
    name: string;
    age: number;
    interests: string[];
    context?: string;
  },
  moral_focus: "kindness" | "honesty" | "courage" | "sharing" | "perseverance"
}
```

**Frontend sends:**
```typescript
{
  child: {
    name: string;
    age: number;
    interests: string[];
    context?: string;
    moralFocus?: string;  // ❌ Wrong location!
  }
}
```

**Fix Required:**
```diff
// frontend/src/lib/types.ts
export interface Child {
  name: string;
  age: number;
  interests: string[];
  context?: string;
- moralFocus?: string;  // Remove this
}

export interface StartRequest {
  child: Child;
+ moral_focus: 'kindness' | 'honesty' | 'courage' | 'sharing' | 'perseverance';
}
```

### ❌ INCOMPATIBLE: Moral Focus Values

| What | Backend | Frontend | Status |
|------|---------|----------|--------|
| Values | `kindness`, `honesty`, `courage`, `sharing`, `perseverance` (5 values) | `honesty`, `kindness`, `courage`, `responsibility`, `empathy`, `perseverance`, `fairness`, `respect` (8 values) | ❌ Mismatch |

**Fix Required:**
```diff
// frontend/src/lib/constants.ts
export const MORAL_FOCUSES = [
  'honesty',
  'kindness',
  'courage',
- 'responsibility',
- 'empathy',
+ 'sharing',
  'perseverance',
- 'fairness',
- 'respect',
] as const;
```

---

## 2. POST /api/story/start - Response Schema

### ❌ COMPLETELY INCOMPATIBLE

**Backend returns:**
```typescript
{
  session_id: string;           // ✅ Compatible
  scene: {                      // ❌ Called "scene", not "initial_scene"
    id: string;                 // ❌ Frontend expects scene_number (number)
    text: string;               // ❌ Frontend expects narrative (string)
    emotion_hint: string;       // ❌ Frontend doesn't expect this
    audio_url: string;          // ❌ Frontend expects audio_prompt (string?)
  },
  choice: {                     // ❌ Frontend expects choices[] array in scene
    prompt: string;             // ❌ No equivalent in frontend
    options: [string, string]   // ❌ Frontend expects {text, consequence_hint}[]
  }
}
```

**Frontend expects:**
```typescript
{
  session_id: string;
  story_title: string;          // ❌ Backend doesn't provide this
  initial_scene: {
    scene_number: number;       // ❌ Backend provides id (string)
    narrative: string;          // ❌ Backend provides text (string)
    choices: [                  // ❌ Backend provides choice at top level
      {
        text: string;
        consequence_hint: string;
      }
    ],
    image_prompt?: string;      // ❌ Backend doesn't provide this
    audio_prompt?: string;      // ❌ Backend provides audio_url (actual URL, not prompt)
    moral_meter?: {             // ❌ Backend doesn't provide meter in start response
      focus: string;
      score: number;
      explanation: string;
    }
  }
}
```

### Required Frontend Changes

**Complete rewrite of StartResponse type:**

```typescript
// frontend/src/lib/types.ts
export interface StartResponse {
  session_id: string;
  scene: {                      // Changed from initial_scene
    id: string;                 // Changed from scene_number
    text: string;               // Changed from narrative
    emotion_hint: 'warm' | 'curious' | 'tense' | 'relieved';
    audio_url: string;          // Changed from audio_prompt
  };
  choice: {
    prompt: string;
    options: [string, string];  // Always exactly 2 options (A/B)
  };
}
```

**Remove from StartResponse:**
- ❌ `story_title` - backend doesn't generate this
- ❌ `scene.choices[]` - moved to top-level `choice`
- ❌ `scene.image_prompt` - not implemented
- ❌ `scene.moral_meter` - only in continue response

---

## 3. POST /api/story/continue - Request Schema

### ❌ COMPLETELY INCOMPATIBLE

**Backend expects:**
```typescript
{
  session_id: string;           // ✅ Compatible
  last_scene_id: string;        // ❌ Frontend doesn't send this
  choice: "A" | "B"             // ❌ Frontend sends chosen_option (number)
}
```

**Frontend sends:**
```typescript
{
  session_id: string;
  chosen_option: number;        // ❌ Backend expects choice: "A" | "B"
}
```

### Required Frontend Changes

```typescript
// frontend/src/lib/types.ts
export interface ContinueRequest {
  session_id: string;
- chosen_option: number;
+ last_scene_id: string;        // Must track from previous response
+ choice: 'A' | 'B';            // Convert from chosen_option (0 → "A", 1 → "B")
}
```

**Conversion logic needed:**
```typescript
// When calling continueStory
const request: ContinueRequest = {
  session_id: sessionId,
  last_scene_id: previousScene.id,  // Must store from previous response
  choice: chosenOption === 0 ? 'A' : 'B'
};
```

---

## 4. POST /api/story/continue - Response Schema

### ❌ COMPLETELY INCOMPATIBLE

**Backend returns:**
```typescript
{
  scene: {                      // ❌ Frontend expects next_scene
    id: string;
    text: string;
    emotion_hint: string;
    audio_url: string;
  },
  ending: {                     // ❌ Frontend doesn't expect this
    reflection: string;
  },
  moral_meter: {                // ❌ Different structure
    kind: 0.0-1.0;              // Backend: 3 separate fields (kind, honest, brave)
    honest: 0.0-1.0;
    brave: 0.0-1.0;
  }
}
```

**Frontend expects:**
```typescript
{
  next_scene: {                 // ❌ Backend returns just "scene"
    scene_number: number;       // ❌ Backend: id (string)
    narrative: string;          // ❌ Backend: text (string)
    choices: [];                // ❌ Backend: not in continue response
    moral_meter: {              // ❌ Backend: top-level, different structure
      focus: string;
      score: number;            // Backend: 3 separate scores (0-1 range)
      explanation: string;      // Backend: no explanation
    }
  },
  story_complete: boolean;      // ❌ Backend doesn't provide this
}
```

### Required Frontend Changes

```typescript
// frontend/src/lib/types.ts
export interface ContinueResponse {
  scene: {                      // Changed from next_scene
    id: string;                 // Changed from scene_number
    text: string;               // Changed from narrative
    emotion_hint: string;
    audio_url: string;
  };
  ending: {
    reflection: string;
  };
  moral_meter: {
-   focus: string;
-   score: number;
-   explanation: string;
+   kind: number;               // 0.0-1.0
+   honest: number;             // 0.0-1.0
+   brave: number;              // 0.0-1.0
  };
- story_complete: boolean;      // Remove - backend doesn't track this
}
```

---

## 5. Missing Features in Backend

Frontend expects these features that backend doesn't implement:

| Feature | Frontend Expects | Backend Provides | Notes |
|---------|-----------------|------------------|-------|
| Story title | ✅ Yes | ❌ No | Not in spec |
| Multiple choices | ✅ Yes (array) | ❌ No (always 2) | Backend is A/B only |
| Choice hints | ✅ Yes | ❌ No | Backend options are plain strings |
| Image prompts | ✅ Yes | ❌ No | Not in spec |
| Story complete flag | ✅ Yes | ❌ No | Backend always ends after Scene 2 |
| Moral explanation | ✅ Yes | ❌ No | Backend uses rule-based scoring |
| Scene numbers | ✅ Yes (number) | ❌ No (string IDs) | Backend uses scene_1, scene_2 |

---

## 6. Moral Meter Structure

### ❌ COMPLETELY DIFFERENT

**Backend (rule-based, 3 scores):**
```typescript
{
  kind: 0.8,      // 0.0-1.0 (keyword matching)
  honest: 0.5,    // 0.0-1.0 (keyword matching)
  brave: 0.6      // 0.0-1.0 (keyword matching)
}
```

**Frontend (single score with explanation):**
```typescript
{
  focus: "kindness",
  score: 80,      // 0-100 (not 0-1)
  explanation: "You showed great kindness..."
}
```

**Frontend must convert:**
```typescript
// Convert backend's moral_meter to frontend format
const convertMoralMeter = (backendMeter: BackendMoralMeter, moralFocus: string) => {
  // Get the relevant score based on focus
  let score = 0.5;
  if (moralFocus === 'kindness' || moralFocus === 'sharing') {
    score = backendMeter.kind;
  } else if (moralFocus === 'honesty') {
    score = backendMeter.honest;
  } else if (moralFocus === 'courage' || moralFocus === 'perseverance') {
    score = backendMeter.brave;
  }

  return {
    focus: moralFocus,
    score: Math.round(score * 100), // Convert 0-1 to 0-100
    explanation: `Your ${moralFocus} score is ${Math.round(score * 100)}%` // Backend doesn't generate this
  };
};
```

---

## 7. Audio Handling

### ❌ INCOMPATIBLE

| What | Backend | Frontend |
|------|---------|----------|
| Field name | `audio_url` | `audio_prompt` |
| Type | Actual URL to MP3 file | Prompt/description (?) |
| Value | `https://worker.dev/audio/session-id/scene_1.mp3` | Expected: prompt string |

**Fix Required:**
```diff
// frontend/src/lib/types.ts
export interface Scene {
  // ...
- audio_prompt?: string;
+ audio_url: string;  // Backend always provides this
}
```

Frontend should use `audio_url` directly in `<audio>` tags:
```typescript
<audio src={scene.audio_url} controls />
```

---

## 8. Age Range

### ⚠️  INCOMPATIBLE

| What | Backend | Frontend |
|------|---------|----------|
| Min age | 5 | 3 |
| Max age | 11 | 12 |

**Fix Required:**
```diff
// frontend/src/lib/constants.ts
- export const MIN_AGE = 3;
+ export const MIN_AGE = 5;
- export const MAX_AGE = 12;
+ export const MAX_AGE = 11;
```

---

## 🛠️ Complete Fix Checklist for Frontend Team

### File: `frontend/src/lib/types.ts`

```typescript
// REPLACE ENTIRE FILE WITH THIS:

import { z } from 'zod';

// Child profile
export interface Child {
  name: string;
  age: number;        // 5-11
  interests: string[]; // max 5
  context?: string;   // max 120 chars
}

// Moral meter (backend format)
export interface MoralMeter {
  kind: number;       // 0.0-1.0
  honest: number;     // 0.0-1.0
  brave: number;      // 0.0-1.0
}

// Scene in the story
export interface Scene {
  id: string;         // "scene_1", "scene_2"
  text: string;
  emotion_hint: 'warm' | 'curious' | 'tense' | 'relieved';
  audio_url: string;  // Actual MP3 URL
}

// Choice structure (for start response)
export interface Choice {
  prompt: string;
  options: [string, string]; // Always exactly 2 (A/B)
}

// Ending structure (for continue response)
export interface Ending {
  reflection: string;
}

// API Request/Response types
export interface StartRequest {
  child: Child;
  moral_focus: 'kindness' | 'honesty' | 'courage' | 'sharing' | 'perseverance';
}

export interface StartResponse {
  session_id: string;
  scene: Scene;
  choice: Choice;
}

export interface ContinueRequest {
  session_id: string;
  last_scene_id: string;  // From previous scene.id
  choice: 'A' | 'B';      // Convert from button index
}

export interface ContinueResponse {
  scene: Scene;
  ending: Ending;
  moral_meter: MoralMeter;
}

// Zod schemas for validation
export const ChildSchema = z.object({
  name: z.string().min(1, "Name is required"),
  age: z.number().min(5).max(11),
  interests: z.array(z.string()).max(5),
  context: z.string().max(120).optional(),
});

export const StartResponseSchema = z.object({
  session_id: z.string().uuid(),
  scene: z.object({
    id: z.string(),
    text: z.string(),
    emotion_hint: z.enum(['warm', 'curious', 'tense', 'relieved']),
    audio_url: z.string().url(),
  }),
  choice: z.object({
    prompt: z.string(),
    options: z.tuple([z.string(), z.string()]),
  }),
});

export const ContinueResponseSchema = z.object({
  scene: z.object({
    id: z.string(),
    text: z.string(),
    emotion_hint: z.enum(['warm', 'curious', 'tense', 'relieved']),
    audio_url: z.string().url(),
  }),
  ending: z.object({
    reflection: z.string(),
  }),
  moral_meter: z.object({
    kind: z.number().min(0).max(1),
    honest: z.number().min(0).max(1),
    brave: z.number().min(0).max(1),
  }),
});

export type ValidatedChild = z.infer<typeof ChildSchema>;
export type ValidatedStartResponse = z.infer<typeof StartResponseSchema>;
export type ValidatedContinueResponse = z.infer<typeof ContinueResponseSchema>;
```

### File: `frontend/src/lib/api.ts`

```diff
- const response = await apiClient.post<StartResponse>('/start', request);
+ const response = await apiClient.post<StartResponse>('/api/story/start', request);

- const response = await apiClient.post<ContinueResponse>('/continue', request);
+ const response = await apiClient.post<ContinueResponse>('/api/story/continue', request);
```

### File: `frontend/src/lib/constants.ts`

```diff
- export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
+ export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787';

export const MORAL_FOCUSES = [
- 'honesty',
  'kindness',
+  'honesty',
  'courage',
- 'responsibility',
- 'empathy',
+ 'sharing',
  'perseverance',
- 'fairness',
- 'respect',
] as const;

- export const MIN_AGE = 3;
+ export const MIN_AGE = 5;
- export const MAX_AGE = 12;
+ export const MAX_AGE = 11;
```

### File: `frontend/src/components/*.tsx` (All components using API)

1. **Remove** all references to `story_title`
2. **Change** `scene.narrative` to `scene.text`
3. **Change** `scene.audio_prompt` to `scene.audio_url`
4. **Change** `scene.choices[]` to top-level `choice.options`
5. **Change** choice click handler to send `'A'` or `'B'` instead of index
6. **Track** `last_scene_id` in state for continue requests
7. **Convert** moral meter from 3 scores to single score display

---

## ⚠️ Breaking Changes Summary

**The frontend team MUST update:**

1. ✅ All API endpoint paths (`/start` → `/api/story/start`)
2. ✅ Base URL port (8000 → 8787)
3. ✅ Complete `StartRequest` schema (move `moral_focus` out of child)
4. ✅ Complete `StartResponse` schema (scene structure, choice structure)
5. ✅ Complete `ContinueRequest` schema (add `last_scene_id`, change choice to A/B)
6. ✅ Complete `ContinueResponse` schema (scene structure, moral meter structure)
7. ✅ Moral focus values (remove 3, add 2)
8. ✅ Age range (5-11 instead of 3-12)
9. ✅ Audio field name (`audio_url` instead of `audio_prompt`)
10. ✅ All UI components referencing these types

---

## 📝 Testing After Frontend Fixes

Once frontend is updated, test with:

```bash
# Terminal 1: Start backend
cd worker
npm run dev

# Terminal 2: Start frontend
cd frontend
npm run dev

# Test flow:
1. Create story with valid inputs
2. Verify Scene 1 loads with audio
3. Click choice A or B
4. Verify Scene 2 loads with ending + moral meter
```

---

## 🎯 Bottom Line

**Current Status**: 🔴 **0% compatible** - nothing will work

**After Frontend Fixes**: 🟢 **100% compatible** - full integration

**Estimated Fix Time**: 2-3 hours (complete schema rewrite + component updates)

**Priority**: 🔴 **CRITICAL** - Must fix before integration testing
