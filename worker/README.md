# TaleWeaver Worker API

Cloudflare Worker backend for TaleWeaver - interactive moral bedtime stories for children aged 5-11.

## Architecture

```
┌─────────────────┐
│  Cloudflare     │
│  Pages (React)  │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────────────┐
│  Cloudflare Worker (Hono + TypeScript)          │
│                                                  │
│  Routes:                                         │
│  • POST /api/story/start                        │
│  • POST /api/story/continue                     │
│  • POST /api/tts (optional)                     │
│  • GET /audio/:sessionId/:sceneId.mp3           │
└───┬──────────────┬──────────────┬──────────────┘
    │              │              │
    ▼              ▼              ▼
┌────────┐   ┌──────────┐   ┌──────────┐
│   KV   │   │    R2    │   │Workers AI│
│Sessions│   │  Audio   │   │ Rewrite  │
└────────┘   └──────────┘   └──────────┘
    │              │              │
    └──────────────┴──────────────┘
                   │
                   ▼
         ┌─────────────────────┐
         │  External APIs      │
         │  • Gemini (stories) │
         │  • ElevenLabs (TTS) │
         └─────────────────────┘
```

## Tech Stack

- **Runtime**: Cloudflare Workers
- **Framework**: Hono (lightweight web framework)
- **Language**: TypeScript
- **Validation**: Zod
- **Storage**: KV (sessions), R2 (audio files)
- **AI**: Workers AI (reading-level rewrite), Gemini (story generation), ElevenLabs (TTS)

## Prerequisites

- Node.js 18+ and npm
- Cloudflare account
- API keys:
  - Gemini API key ([Get one here](https://makersuite.google.com/app/apikey))
  - ElevenLabs API key and Voice ID ([Get one here](https://elevenlabs.io))

## Setup Instructions

### 1. Install Dependencies

```bash
cd worker
npm install
```

### 2. Configure Cloudflare Resources

#### A. Login to Cloudflare
Already done via `wrangler login`

#### B. Enable R2 in Cloudflare Dashboard

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Select your account
3. Navigate to **R2 Object Storage**
4. Click **Enable R2** (if not already enabled)
5. Accept the terms

#### C. Create R2 Bucket

```bash
npx wrangler r2 bucket create taleweaver-audio
```

This will create the bucket. After creation, update `wrangler.toml`:

```toml
# Uncomment these lines:
[[r2_buckets]]
binding = "AUDIO_BUCKET"
bucket_name = "taleweaver-audio"
```

#### D. (Optional) Configure R2 Public Access

For public audio URLs, you can:

**Option 1: Use Worker Proxy** (Default)
- Audio URLs will be served via `/audio/:sessionId/:sceneId.mp3`
- No additional config needed

**Option 2: Public R2 Bucket**
```bash
# Enable public access via R2.dev subdomain
npx wrangler r2 bucket domain add taleweaver-audio --jurisdiction=auto
```

Then add to `wrangler.toml` [vars]:
```toml
R2_PUBLIC_URL = "https://pub-xxxxx.r2.dev"
```

### 3. Set Secrets

Create a `.dev.vars` file for local development:

```bash
cp .dev.vars.example .dev.vars
```

Edit `.dev.vars` and add your API keys:

```env
GEMINI_API_KEY=your_actual_gemini_api_key
ELEVENLABS_API_KEY=your_actual_elevenlabs_api_key
ELEVENLABS_VOICE_ID=your_actual_voice_id
```

For production, set secrets via Wrangler:

```bash
npx wrangler secret put GEMINI_API_KEY
# When prompted, paste your Gemini API key

npx wrangler secret put ELEVENLABS_API_KEY
# When prompted, paste your ElevenLabs API key

npx wrangler secret put ELEVENLABS_VOICE_ID
# When prompted, paste your ElevenLabs Voice ID
```

### 4. Verify wrangler.toml

Your `wrangler.toml` should look like this:

```toml
name = "taleweaver-worker"
main = "src/index.ts"
compatibility_date = "2025-10-18"
compatibility_flags = ["nodejs_compat"]

[vars]
ELEVENLABS_MODEL_ID = "eleven_multilingual_v2"
SESSION_TTL_HOURS = "12"

[[kv_namespaces]]
binding = "TALEWEAVER_SESSIONS"
id = "2a179ba456cb4a33821587523071ce0b"
preview_id = "03edccb4318e426d8be2e044046c222d"

[[r2_buckets]]
binding = "AUDIO_BUCKET"
bucket_name = "taleweaver-audio"

[ai]
binding = "AI"
```

## Development

### Run Locally

```bash
npm run dev
```

This starts the Wrangler dev server at `http://localhost:8787`

### Test the API

**Health Check:**
```bash
curl http://localhost:8787/
```

**Start a Story:**
```bash
curl -X POST http://localhost:8787/api/story/start \
  -H "Content-Type: application/json" \
  -d '{
    "child": {
      "name": "Maya",
      "age": 7,
      "interests": ["space", "stars", "drawing"],
      "context": "starting a new school"
    },
    "moral_focus": "kindness"
  }'
```

**Continue the Story:**
```bash
curl -X POST http://localhost:8787/api/story/continue \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "<session_id_from_start_response>",
    "last_scene_id": "scene_1",
    "choice": "A"
  }'
```

### Type Checking

```bash
npm run type-check
```

### Linting

```bash
npm run lint
```

### Formatting

```bash
npm run format
```

## Deployment

### Deploy to Cloudflare

```bash
npm run deploy
```

This publishes your Worker to Cloudflare. You'll get a URL like:
```
https://taleweaver-worker.<your-subdomain>.workers.dev
```

### View Logs

```bash
npm run tail
```

This streams real-time logs from your deployed Worker.

## API Endpoints

### POST /api/story/start

Creates a new story session with Scene 1.

**Request:**
```json
{
  "child": {
    "name": "string",
    "age": 5-11,
    "interests": ["string"],
    "context": "string (optional, max 120 chars)"
  },
  "moral_focus": "kindness|honesty|courage|sharing|perseverance"
}
```

**Response:**
```json
{
  "session_id": "uuid",
  "scene": {
    "id": "scene_1",
    "text": "string",
    "emotion_hint": "warm|curious|tense|relieved",
    "audio_url": "https://..."
  },
  "choice": {
    "prompt": "string",
    "options": ["string", "string"]
  }
}
```

### POST /api/story/continue

Continues the story with Scene 2 based on choice.

**Request:**
```json
{
  "session_id": "uuid",
  "last_scene_id": "string",
  "choice": "A|B"
}
```

**Response:**
```json
{
  "scene": {
    "id": "scene_2",
    "text": "string",
    "emotion_hint": "string",
    "audio_url": "https://..."
  },
  "ending": {
    "reflection": "string"
  },
  "moral_meter": {
    "kind": 0.0-1.0,
    "honest": 0.0-1.0,
    "brave": 0.0-1.0
  }
}
```

### POST /api/tts (Optional)

Regenerates TTS audio for a scene.

**Request:**
```json
{
  "session_id": "uuid",
  "scene_id": "string",
  "text": "string",
  "emotion_hint": "warm|curious|tense|relieved"
}
```

**Response:**
```json
{
  "audio_url": "https://..."
}
```

### GET /audio/:sessionId/:sceneId.mp3

Serves audio file from R2 (proxy endpoint).

## Project Structure

```
worker/
├── src/
│   ├── index.ts                 # Main Hono app + router
│   ├── types/
│   │   └── env.ts              # Cloudflare bindings types
│   ├── schemas/
│   │   └── story.ts            # Zod validation schemas
│   ├── routes/
│   │   ├── storyStart.ts       # POST /api/story/start
│   │   ├── storyContinue.ts    # POST /api/story/continue
│   │   └── tts.ts              # POST /api/tts
│   ├── services/
│   │   ├── kv.ts               # KV session management
│   │   ├── r2.ts               # R2 audio storage
│   │   ├── gemini.ts           # Gemini API client
│   │   ├── elevenlabs.ts       # ElevenLabs TTS
│   │   ├── workersAi.ts        # Workers AI rewrite
│   │   ├── moralMeter.ts       # Moral scoring logic
│   │   └── summary.ts          # Prior summary builder
│   ├── prompts/
│   │   ├── start.ts            # Start prompt template
│   │   ├── continue.ts         # Continue prompt template
│   │   └── rewrite.ts          # Rewrite prompt template
│   └── utils/
│       ├── errors.ts           # Custom error classes
│       ├── logger.ts           # Logging utility
│       └── validation.ts       # Input validation helpers
├── package.json
├── tsconfig.json
├── wrangler.toml
└── README.md
```

## Environment Variables

### Secrets (set via `wrangler secret put`)
- `GEMINI_API_KEY` - Gemini API key for story generation
- `ELEVENLABS_API_KEY` - ElevenLabs API key for TTS
- `ELEVENLABS_VOICE_ID` - ElevenLabs Voice ID

### Public Variables (in `wrangler.toml`)
- `ELEVENLABS_MODEL_ID` - TTS model (default: "eleven_multilingual_v2")
- `SESSION_TTL_HOURS` - Session expiration in hours (default: 12)
- `R2_PUBLIC_URL` - (Optional) Public R2 bucket URL

## Cloudflare Resources Summary

| Resource | Binding Name | Purpose | Status |
|----------|--------------|---------|--------|
| KV Namespace | `TALEWEAVER_SESSIONS` | Session storage | ✅ Created |
| R2 Bucket | `AUDIO_BUCKET` | Audio file storage | ⚠️ Manual setup required |
| Workers AI | `AI` | Grade-level rewrite | ✅ Auto-available |

## Next Steps

1. **Enable R2** in Cloudflare Dashboard
2. **Create R2 bucket**: `npx wrangler r2 bucket create taleweaver-audio`
3. **Uncomment R2 binding** in `wrangler.toml`
4. **Set production secrets** via `wrangler secret put`
5. **Test locally** with `npm run dev`
6. **Deploy** with `npm run deploy`

## Troubleshooting

### KV/R2 Not Found
- Make sure you've uncommented the bindings in `wrangler.toml`
- Run `wrangler kv:namespace list` to verify KV namespace exists
- Run `wrangler r2 bucket list` to verify R2 bucket exists

### Secrets Not Working
- Local dev: Check `.dev.vars` file
- Production: Run `wrangler secret list` to verify secrets are set

### CORS Issues
- Worker has CORS enabled for all origins (good for hackathon)
- Tighten in production by updating the `cors()` middleware in `src/index.ts`

### Workers AI Errors
- Workers AI is in beta and may have rate limits
- The code falls back to original text if rewrite fails

## License

MIT
