# Frontend ↔ Backend API Compatibility Report

_Generated: 2025-10-18_

This document summarises how the TaleWeaver frontend (React/Vite/Tailwind) aligns with the backend contract described in the provided specification. All paths are relative to `frontend/`.

---

## 1. Endpoints & Transport

| Concern | Backend Contract | Frontend Implementation | Status |
| --- | --- | --- | --- |
| Base URL | Relative `/api/...` | `src/lib/api.ts` uses Axios with `baseURL = import.meta.env.VITE_API_BASE_URL || ''` | ✅ |
| Start endpoint | `POST /api/story/start` | `api.startStory` posts to `/api/story/start` | ✅ |
| Continue endpoint | `POST /api/story/continue` | `api.continueStory` posts to `/api/story/continue` (only when interactive) | ✅ |
| Health check | `/health` | `api.healthCheck` uses `/health` | ✅ |

All requests use JSON payloads and set `Content-Type: application/json`.

---

## 2. Request Payloads

### 2.1 Start Story (`POST /api/story/start`)

- **Frontend source:** `src/components/StoryForm.tsx`, `src/pages/Create.tsx`, `src/lib/types.ts`
- **Payload shape:**  
  ```ts
  interface StartRequest {
    child: {
      name: string;
      gender: 'male' | 'female';
      age_group: '4-6' | '7-9' | '10-12';
      interests: string[]; // 1–5 items
      context?: string;
    };
    duration_min: 1 | 2 | 3;
    interactive: boolean;
  }
  ```
- **Validation & UX guards:**
  - Zod schema (`ChildSchema`) enforces presence of name, gender, age_group, and at least one interest.
  - `StoryForm` limits interests to 5 and trims whitespace.
  - UI toggles for `interactive` and `duration_min` guarantee valid enums.

**Status:** ✅ Fully aligned with backend contract.

### 2.2 Continue Story (`POST /api/story/continue`)

- **Frontend source:** `src/pages/Play.tsx`, `src/lib/types.ts`
- **Payload shape:**  
  ```ts
  interface ContinueRequest {
    session_id: string;
    from_checkpoint: number;
    chosen: 'A' | 'B';
  }
  ```
- `Play` derives `from_checkpoint` from the current checkpoint index and `chosen` from the selected option id.
- Continue calls are issued only when `interactive === true`.

**Status:** ✅ Matches backend requirements.

---

## 3. Response Handling

### 3.1 Start Story (Interactive)

- **Validation:** `api.startStory` parses responses with `StartResponseInteractiveSchema` when `settings.interactive === true`.
- **Shape handled:**  
  ```ts
  {
    session_id: string;
    settings: { duration_min; interactive: true; age_group };
    current_segment: { checkpoint_index; text; emotion_hint; audio_url };
    next_options: Array<{
      id: 'A' | 'B';
      label: string;
      segment: { from_checkpoint; to_checkpoint; text; emotion_hint; audio_url };
    }>;
    remaining_checkpoints: number;
  }
  ```
- **UI usage:**  
  - Stored via `StoredStorySession.interactive_state`.
  - `Play` renders current and previous checkpoints, plays narration, and exposes options.

**Status:** ✅ No discrepancies.

### 3.2 Start Story (Non-Interactive)

- **Validation:** `StartResponseNonInteractiveSchema`
- **Shape handled:**  
  ```ts
  {
    session_id: string;
    settings: { duration_min; interactive: false; age_group };
    segments: Array<{ checkpoint_index; text; emotion_hint; audio_url }>;
  }
  ```
- **UI usage:** `Play` renders each segment sequentially with audio controls.

**Status:** ✅ Fully compatible.

### 3.3 Continue Story (Interactive Only)

- **Validation:** `ContinueResponseMidSchema` and `ContinueResponseFinalSchema`
- **Mid-flow shape:**  
  ```ts
  {
    ack: { played_id: 'A' | 'B'; played_segment: { from_checkpoint; to_checkpoint; text; emotion_hint; audio_url } };
    next_options: [...];
    reached_final: false;
  }
  ```
- **Final shape:**  
  ```ts
  {
    ack: {...};
    reached_final: true;
    ending: { reflection: string };
  }
  ```
- **UI handling:**  
  - Converts `played_segment` into the next checkpoint entry.
  - Maintains a history of checkpoints.
  - Displays ending reflection when `reached_final` becomes `true`.

**Status:** ✅ Contract respected.

---

## 4. Persistence & Session State

- Stored under `sessionStorage['taleweaver.storySession']`.
- Structure (`StoredStorySession`) mirrors backend responses and differentiates interactive/non-interactive flows.
- Recovery logic in `Play` validates essential keys before usage and falls back to `/create` on corruption.

**Status:** ✅ Aligned & defensive.

---

## 5. Additional Checks

| Check | Result | Notes |
| --- | --- | --- |
| Zod schemas mirror backend enums & structure | ✅ | `src/lib/types.ts` |
| Interest cap enforced (≤5) | ✅ | `StoryForm` + `MAX_INTERESTS` |
| Snake_case keys preserved in requests | ✅ | `duration_min`, `age_group` |
| No unused legacy fields (e.g., moral focus) | ✅ | Removed from types & UI |
| Build/type-check (`npm run build`) | ✅ | Vite/TS build succeeds |

---

## 6. Observations & Risks

- `remaining_checkpoints` is only supplied in the initial interactive response. The frontend decrements this counter locally after each continue call; if the backend’s definition changes (e.g., non-linear checkpoint counts), the UI badge could drift. Behaviour otherwise remains correct.
- Audio playback relies on browser autoplay permissions; failures are already caught and ignored gracefully.

---

## 7. Conclusion

All implemented frontend API interactions conform to the provided backend contract. No outstanding incompatibilities were identified during this audit.
