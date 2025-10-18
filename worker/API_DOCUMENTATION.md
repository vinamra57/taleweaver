# TaleWeaver API Documentation

**Version**: 2.0 (Rebuilt with Branching Interactive Stories)
**Base URL**: `http://localhost:8787` (dev) or `https://taleweaver-worker.<your-subdomain>.workers.dev` (prod)

---

## Overview

TaleWeaver generates personalized interactive bedtime stories for children aged 4-12, with optional branching narratives based on user choices.

### Key Features

- **Two-phase LLM generation**: Detailed prompt creation → Story generation
- **Interactive mode**: Branching stories with choice points
- **Non-interactive mode**: Continuous single narrative
- **Gender-aware**: Uses appropriate pronouns and themes
- **Age-adaptive**: Vocabulary complexity adjusts by age range
- **Moral focus**: Stories incorporate lessons (kindness, honesty, courage, sharing, perseverance)
- **TTS audio**: Pre-generated audio for all segments (both branches)
- **Pre-generation**: Always one step ahead (generates next 2 branches while user listens)

---

## API Endpoints

### 1. Health Check

```
GET /
```

**Response**:
```json
{
  "service": "TaleWeaver API",
  "version": "1.0.0",
  "status": "running",
  "endpoints": {
    "start": "POST /api/story/start",
    "continue": "POST /api/story/continue",
    "audio": "GET /audio/:sessionId/:sceneId.mp3"
  }
}
```

---

### 2. Start Story

```
POST /api/story/start
```

Creates a new story session (interactive or non-interactive).

**Request Body**:
```json
{
  "child": {
    "name": "Maya",
    "gender": "female",
    "age_range": "7-9",
    "interests": "space, stars, drawing",
    "context": "starting a new school" // optional
  },
  "story_length": 2, // 1, 2, or 3 minutes
  "interactive": true, // or false
  "moral_focus": "kindness" // kindness|honesty|courage|sharing|perseverance
}
```

**Field Definitions**:
- `name`: Child's name (letters, spaces, hyphens, apostrophes only)
- `gender`: `"male"` or `"female"` (affects pronouns and themes)
- `age_range`: `"4-6"`, `"7-9"`, or `"10-12"` (affects vocabulary complexity)
- `interests`: Free-text string (max 500 chars)
- `context`: Optional story context (max 200 chars)
- `story_length`: `1`, `2`, or `3` (minutes → checkpoints for interactive mode)
- `interactive`: `true` = branching story with choices, `false` = continuous narrative
- `moral_focus`: Moral theme woven into the story

**Response (Non-Interactive)**:
```json
{
  "session_id": "uuid",
  "segment": {
    "id": "segment_1",
    "text": "Full story text (~150/300/450 words)",
    "audio_url": "https://worker.dev/audio/session-id/segment_1.mp3",
    "checkpoint_number": 0
  },
  "story_complete": true
}
```

**Response (Interactive)**:
```json
{
  "session_id": "uuid",
  "segment": {
    "id": "segment_1",
    "text": "First segment (~75/100/112 words)",
    "audio_url": "https://worker.dev/audio/session-id/segment_1.mp3",
    "checkpoint_number": 0
  },
  "next_branches": [
    {
      "choice_text": "Share the toy with the new friend",
      "choice_value": "A",
      "segment": {
        "id": "segment_2a",
        "text": "Segment if choice A is chosen",
        "audio_url": "https://worker.dev/audio/session-id/segment_2a.mp3",
        "checkpoint_number": 1
      }
    },
    {
      "choice_text": "Keep playing alone",
      "choice_value": "B",
      "segment": {
        "id": "segment_2b",
        "text": "Segment if choice B is chosen",
        "audio_url": "https://worker.dev/audio/session-id/segment_2b.mp3",
        "checkpoint_number": 1
      }
    }
  ],
  "story_complete": false
}
```

**Story Structure**:

- **1-minute story** (150 words):
  - Non-interactive: 1 segment (150 words)
  - Interactive: 2 segments × 75 words, 1 choice point

- **2-minute story** (300 words):
  - Non-interactive: 1 segment (300 words)
  - Interactive: 3 segments × 100 words, 2 choice points

- **3-minute story** (450 words):
  - Non-interactive: 1 segment (450 words)
  - Interactive: 4 segments × 112 words, 3 choice points

---

### 3. Continue Story

```
POST /api/story/continue
```

Continues an interactive story after the user makes a choice.

**Request Body**:
```json
{
  "session_id": "uuid",
  "checkpoint": 1, // Which checkpoint was just reached
  "chosen_branch": "A" // or "B"
}
```

**Response (Not Final)**:
```json
{
  "segment": {
    "id": "segment_2a",
    "text": "Pre-generated segment for chosen branch",
    "audio_url": "https://worker.dev/audio/session-id/segment_2a.mp3",
    "checkpoint_number": 1
  },
  "next_branches": [
    {
      "choice_text": "Next choice A",
      "choice_value": "A",
      "segment": {
        "id": "segment_3a",
        "text": "Next segment if A chosen",
        "audio_url": "https://worker.dev/audio/session-id/segment_3a.mp3",
        "checkpoint_number": 2
      }
    },
    {
      "choice_text": "Next choice B",
      "choice_value": "B",
      "segment": {
        "id": "segment_3b",
        "text": "Next segment if B chosen",
        "audio_url": "https://worker.dev/audio/session-id/segment_3b.mp3",
        "checkpoint_number": 2
      }
    }
  ],
  "story_complete": false
}
```

**Response (Final Checkpoint)**:
```json
{
  "segment": {
    "id": "segment_4a",
    "text": "Final segment with story conclusion",
    "audio_url": "https://worker.dev/audio/session-id/segment_4a.mp3",
    "checkpoint_number": 3
  },
  "story_complete": true
}
```

---

### 4. Audio Proxy

```
GET /audio/:sessionId/:sceneId.mp3
```

Serves pre-generated audio files from R2 storage.

**Example**:
```
GET /audio/abc-123-def/segment_1.mp3
```

**Response**: MP3 audio file (streamed)

---

## Error Responses

All errors follow this format:

```json
{
  "error": "Error Type",
  "message": "Detailed error message"
}
```

### Error Codes

| Code | Error Type | Description |
|------|------------|-------------|
| 400 | Validation Error | Invalid input (name, age, etc.) |
| 410 | Session Expired | Session not found in KV (expired after 12h) |
| 500 | Story Generation Failed | Gemini API error |
| 500 | TTS Generation Failed | ElevenLabs API error |
| 500 | Storage Error | KV or R2 error |

---

## Architecture Flow

### Start Flow (Interactive Mode)

```
1. User submits inputs
   ↓
2. [Phase 1] Generate detailed story prompt with Gemini
   ↓
3. [Phase 2] Generate first segment + 2 branches with Gemini
   ↓
4. Generate TTS for segment 1 (in parallel)
5. Generate TTS for branch A (in parallel)
6. Generate TTS for branch B (in parallel)
   ↓
7. Upload all 3 MP3s to R2
   ↓
8. Save session to KV (12h TTL)
   ↓
9. Return segment 1 + both pre-generated branches
```

### Continue Flow

```
1. User makes choice (A or B)
   ↓
2. Fetch session from KV
   ↓
3. Return pre-generated segment for chosen branch
   ↓
4. If NOT final checkpoint:
   a. Generate next 2 branches with Gemini
   b. Generate TTS for both branches (parallel)
   c. Upload both MP3s to R2
   d. Update session in KV
   e. Return segment + next branches
   ↓
5. If final checkpoint:
   a. Update session in KV
   b. Return final segment (no more branches)
```

---

## Example Usage

### Non-Interactive 1-Minute Story

**Request**:
```json
{
  "child": {
    "name": "Arjun",
    "gender": "male",
    "age_range": "7-9",
    "interests": "soccer, jungle animals"
  },
  "story_length": 1,
  "interactive": false,
  "moral_focus": "honesty"
}
```

**Response**:
```json
{
  "session_id": "abc-123",
  "segment": {
    "id": "segment_1",
    "text": "[~150 word complete story about Arjun]",
    "audio_url": "/audio/abc-123/segment_1.mp3",
    "checkpoint_number": 0
  },
  "story_complete": true
}
```

### Interactive 3-Minute Story

**1. Start Request**:
```json
{
  "child": {
    "name": "Maya",
    "gender": "female",
    "age_range": "4-6",
    "interests": "unicorns, rainbows",
    "context": "afraid of the dark"
  },
  "story_length": 3,
  "interactive": true,
  "moral_focus": "courage"
}
```

**1. Start Response**:
```json
{
  "session_id": "xyz-789",
  "segment": {
    "id": "segment_1",
    "text": "[~112 word opening segment]",
    "audio_url": "/audio/xyz-789/segment_1.mp3",
    "checkpoint_number": 0
  },
  "next_branches": [
    {
      "choice_text": "Turn on the magic lantern",
      "choice_value": "A",
      "segment": {
        "id": "segment_2a",
        "text": "[~112 words if A chosen]",
        "audio_url": "/audio/xyz-789/segment_2a.mp3",
        "checkpoint_number": 1
      }
    },
    {
      "choice_text": "Call her unicorn friend",
      "choice_value": "B",
      "segment": {
        "id": "segment_2b",
        "text": "[~112 words if B chosen]",
        "audio_url": "/audio/xyz-789/segment_2b.mp3",
        "checkpoint_number": 1
      }
    }
  ],
  "story_complete": false
}
```

**2. First Continue Request** (user chose A):
```json
{
  "session_id": "xyz-789",
  "checkpoint": 1,
  "chosen_branch": "A"
}
```

**2. First Continue Response**:
```json
{
  "segment": {
    "id": "segment_2a",
    "text": "[Pre-generated segment 2a]",
    "audio_url": "/audio/xyz-789/segment_2a.mp3",
    "checkpoint_number": 1
  },
  "next_branches": [
    {
      "choice_text": "Explore the glowing cave",
      "choice_value": "A",
      "segment": {
        "id": "segment_3a",
        "text": "[~112 words]",
        "audio_url": "/audio/xyz-789/segment_3a.mp3",
        "checkpoint_number": 2
      }
    },
    {
      "choice_text": "Follow the rainbow path",
      "choice_value": "B",
      "segment": {
        "id": "segment_3b",
        "text": "[~112 words]",
        "audio_url": "/audio/xyz-789/segment_3b.mp3",
        "checkpoint_number": 2
      }
    }
  ],
  "story_complete": false
}
```

**3. Second Continue Request** (user chose B):
```json
{
  "session_id": "xyz-789",
  "checkpoint": 2,
  "chosen_branch": "B"
}
```

**3. Second Continue Response**:
```json
{
  "segment": {
    "id": "segment_3b",
    "text": "[Pre-generated segment 3b]",
    "audio_url": "/audio/xyz-789/segment_3b.mp3",
    "checkpoint_number": 2
  },
  "next_branches": [
    {
      "choice_text": "Share the magic with everyone",
      "choice_value": "A",
      "segment": {
        "id": "segment_4a",
        "text": "[~112 words]",
        "audio_url": "/audio/xyz-789/segment_4a.mp3",
        "checkpoint_number": 3
      }
    },
    {
      "choice_text": "Keep the magic secret",
      "choice_value": "B",
      "segment": {
        "id": "segment_4b",
        "text": "[~112 words]",
        "audio_url": "/audio/xyz-789/segment_4b.mp3",
        "checkpoint_number": 3
      }
    }
  ],
  "story_complete": false
}
```

**4. Third Continue Request** (user chose A - FINAL):
```json
{
  "session_id": "xyz-789",
  "checkpoint": 3,
  "chosen_branch": "A"
}
```

**4. Third Continue Response** (FINAL):
```json
{
  "segment": {
    "id": "segment_4a",
    "text": "[Final segment with story conclusion and courage lesson]",
    "audio_url": "/audio/xyz-789/segment_4a.mp3",
    "checkpoint_number": 3
  },
  "story_complete": true
}
```

---

## Session Management

- **Storage**: Cloudflare KV
- **TTL**: 12 hours
- **Structure**:
  ```json
  {
    "session_id": "uuid",
    "child": { ...child object... },
    "story_length": 3,
    "interactive": true,
    "moral_focus": "courage",
    "story_prompt": "Detailed story prompt from phase 1",
    "total_checkpoints": 3,
    "current_checkpoint": 2,
    "words_per_segment": 112,
    "chosen_path": ["A", "B", "A"],
    "segments": [...all generated segments...],
    "created_at": "2025-10-18T12:00:00Z"
  }
  ```

---

## Rate Limits & Performance

### Expected Latency

- **Start (interactive)**: 15-25 seconds
  - Phase 1 (prompt): ~2-3s
  - Phase 2 (segment + 2 branches): ~5-8s
  - TTS for 3 segments (parallel): ~5-7s
  - R2 uploads: ~1-2s

- **Start (non-interactive)**: 8-12 seconds
  - Phase 1: ~2-3s
  - Phase 2: ~3-4s
  - TTS: ~2-3s

- **Continue**: 10-15 seconds (if not final)
  - Segment retrieval: <100ms
  - Generate next branches: ~5-8s
  - TTS for 2 segments (parallel): ~4-5s

- **Continue**: <100ms (if final)
  - Just retrieves pre-generated segment

### Optimization Strategies

1. **Pre-generation**: Audio for both branches generated ahead of time
2. **Parallel TTS**: Both branches processed simultaneously
3. **KV caching**: Sessions cached for 12h
4. **Cloudflare edge**: Global CDN for low-latency audio delivery

---

## Development

### Local Testing

```bash
cd worker
npm run dev
```

Server runs at `http://localhost:8787`

### Deployment

```bash
npm run deploy
```

---

## Tech Stack

- **Framework**: Hono (lightweight Node.js framework)
- **Runtime**: Cloudflare Workers
- **Storage**: KV (sessions), R2 (audio files)
- **AI**: Gemini (story generation), ElevenLabs (TTS), Workers AI (optional)
- **Language**: TypeScript + Zod validation
