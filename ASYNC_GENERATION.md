# Async Story Branch Generation

## Overview
This update adds **concurrent story generation** to TaleWeaver, allowing Gemini API calls and TTS generation to happen in the background while the user listens to audio. This eliminates waiting time between story segments.

## How It Works

### Before (Synchronous)
```
User requests story
  ↓
Generate first segment + TTS ← USER WAITS
  ↓
Generate next 2 branches + TTS ← USER WAITS
  ↓
Return response
  ↓
User listens to audio
  ↓
User makes choice
  ↓
[Repeat: Generate branches + TTS ← USER WAITS]
```

### After (Asynchronous)
```
User requests story
  ↓
Generate first segment + TTS ← USER WAITS (first time only)
  ↓
Return response immediately
  ↓
User listens to audio ← WHILE branches generate in background
  ↓
User makes choice
  ↓
Branches already ready! ← NO WAITING
  ↓
Return segment immediately
  ↓
User listens to audio ← WHILE next branches generate
```

## Architecture Changes

### 1. Session Schema Updates
**File:** `worker/src/schemas/story.ts`

Added tracking fields to Session:
- `next_branches_ready: boolean` - Indicates if next branches are generated
- `generation_in_progress: boolean` - Indicates if background generation is running
- `choice_text?: string` - Added to StorySegment to store choice text with segments

### 2. Async Generation Service
**File:** `worker/src/services/asyncBranchGeneration.ts` (NEW)

Two main functions:
- `generateFirstBranchesAsync()` - Generates initial branches in background
- `generateNextBranchesAsync()` - Generates continuation branches in background

Both functions:
- Update session state (`generation_in_progress`)
- Call Gemini API
- Generate TTS for both branches
- Upload audio to R2
- Save segments to session
- Mark branches as ready (`next_branches_ready = true`)

### 3. Updated Routes

#### `/api/story/start`
**File:** `worker/src/routes/storyStart.ts`

Changes:
- Generate and return first segment immediately
- Trigger async generation of first two branches using `c.executionCtx.waitUntil()`
- Response doesn't include `next_branches` (they'll be ready by the time audio finishes)

#### `/api/story/continue`
**File:** `worker/src/routes/storyContinue.ts`

Changes:
- Check if next branches are already generated
- If ready, return them from session immediately
- Trigger async generation of branches for the NEXT checkpoint
- If not ready, log warning (user may need to wait - rare edge case)

### 4. New Status Endpoint
**File:** `worker/src/routes/branchStatus.ts` (NEW)

**Endpoint:** `GET /api/story/status/:sessionId`

Returns:
```json
{
  "branches_ready": true,
  "generation_in_progress": false,
  "current_checkpoint": 1
}
```

Allows frontend to poll and check if branches are ready before user makes a choice.

### 5. Updated Main Router
**File:** `worker/src/index.ts`

Added new status endpoint: `GET /api/story/status/:sessionId`

## Key Features

### 1. Cloudflare Workers `waitUntil()`
Uses `c.executionCtx.waitUntil()` to keep background tasks running after response is sent:
```typescript
c.executionCtx.waitUntil(
  generateFirstBranchesAsync(sessionId, env, workerUrl)
);
```

### 2. Pre-Generation Strategy
- Always generates branches ONE checkpoint ahead
- User listens to audio while next branches generate
- By the time user makes a choice, branches are ready

### 3. Graceful Degradation
- If branches aren't ready when user makes choice (rare), logs warning
- Frontend can check status endpoint before allowing choice
- System still works, just may have slight delay in worst case

## Frontend Integration

### Recommended Flow
```typescript
// 1. Start story
const startResponse = await fetch('/api/story/start', { ... });
const { session_id, segment } = startResponse;

// 2. Play audio for first segment
playAudio(segment.audio_url);

// 3. Poll status while audio plays (optional but recommended)
const checkStatus = setInterval(async () => {
  const status = await fetch(`/api/story/status/${session_id}`);
  const { branches_ready } = status;

  if (branches_ready) {
    enableChoiceButtons(); // Branches are ready!
    clearInterval(checkStatus);
  }
}, 1000); // Check every second

// 4. User makes choice
const continueResponse = await fetch('/api/story/continue', {
  body: JSON.stringify({
    session_id,
    checkpoint: 1,
    chosen_branch: 'A'
  })
});

// 5. Get chosen segment and next branches (if not final)
const { segment, next_branches } = continueResponse;
```

## Performance Improvements

### Timing Estimates
Assuming:
- Gemini API call: ~3-5 seconds
- TTS generation (2 segments): ~4-6 seconds
- Total per checkpoint: ~7-11 seconds

**Before:**
- User waits 7-11 seconds per choice
- For 3-checkpoint story: 21-33 seconds of waiting

**After:**
- User waits 0 seconds (after initial load)
- Background generation happens during 15-30 second audio playback
- Net waiting time: ~0 seconds

## Testing with DISABLE_TTS Flag

To speed up testing, use the `DISABLE_TTS=true` flag in `.dev.vars`:
```bash
DISABLE_TTS=true
```

This returns silent audio buffers instead of calling ElevenLabs, making testing much faster.

## Error Handling

The async generation service handles errors gracefully:
1. Catches all errors in generation
2. Updates session to mark `generation_in_progress = false`
3. Logs errors for debugging
4. Frontend can retry or fall back to synchronous generation

## Migration Notes

### Breaking Changes
- `StartResponse.next_branches` is now optional (undefined during async generation)
- `StorySegment` now has optional `choice_text` field
- Session schema has two new required fields

### Backward Compatibility
- Existing sessions without new fields will fail validation
- Consider clearing KV store during deployment
- Or add migration logic to handle old sessions

## Future Enhancements

1. **Smart Pre-loading**: Pre-generate 2+ checkpoints ahead based on story length
2. **Priority Queue**: Prioritize generation for segments user is likely to choose
3. **Cache Warming**: Pre-generate common story paths
4. **Streaming Audio**: Stream TTS audio as it's generated (using Cloudflare Streams)
5. **WebSocket Updates**: Push branch ready notifications instead of polling
