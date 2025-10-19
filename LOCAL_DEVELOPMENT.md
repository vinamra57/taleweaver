# Local Development Setup Guide

This guide helps your teammates set up TaleWeaver for local development.

## Prerequisites

- Node.js 18+ installed
- npm or yarn
- Git
- API keys (see below)

## Quick Start

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd taleweaver
```

### 2. Backend Setup (Worker)

```bash
cd worker

# Install dependencies
npm install

# Copy the example env file and add your API keys
cp .dev.vars.example .dev.vars

# Edit .dev.vars with your actual API keys (see section below)
nano .dev.vars  # or use your preferred editor

# Start the development server (runs on http://localhost:8787)
npm run dev
```

### 3. Frontend Setup (in a new terminal)

```bash
cd frontend

# Install dependencies
npm install

# Optional: Copy env example if you need custom configuration
cp .env.example .env.local

# Start the development server (runs on http://localhost:5173)
npm run dev
```

### 4. Access the App

Open your browser to http://localhost:5173

The frontend will automatically connect to the backend at http://localhost:8787.

## Getting API Keys

You'll need API keys from the following services:

### Google Gemini API
1. Go to https://makersuite.google.com/app/apikey
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the key to `GEMINI_API_KEY` in worker/.dev.vars

### ElevenLabs API
1. Go to https://elevenlabs.io/
2. Sign up or log in
3. Go to Settings → API Keys (https://elevenlabs.io/app/settings/api-keys)
4. Copy your API key to `ELEVENLABS_API_KEY` in worker/.dev.vars
5. (Optional) Get a voice ID from https://elevenlabs.io/app/voices for `ELEVENLABS_VOICE_ID`

### JWT Secret
Generate a secure random secret:

```bash
openssl rand -base64 64
```

Copy the output to `JWT_SECRET` in worker/.dev.vars

## How Local Development Works

### Automatic API Routing

The frontend automatically detects your environment:

- **Local Dev (port 5173)**: Connects to http://localhost:8787
- **Production**: Connects to https://taleweaver-worker.vinamra0305.workers.dev

No manual configuration needed! Just run both servers and it works.

### File Structure

```
taleweaver/
├── worker/              # Backend (Cloudflare Worker)
│   ├── src/
│   ├── .dev.vars       # Your API keys (gitignored, create from .dev.vars.example)
│   └── wrangler.toml   # Cloudflare configuration
├── frontend/           # Frontend (React + Vite)
│   ├── src/
│   └── .env.local      # Optional frontend config (gitignored)
└── README.md
```

### What's Gitignored (Safe to Keep Locally)

These files contain sensitive information and are NOT committed to git:

- `worker/.dev.vars` - Your API keys
- `worker/.wrangler/` - Build artifacts
- `frontend/.env.local` - Local overrides
- `frontend/dist/` - Build output
- `node_modules/` - Dependencies

### What IS Committed (Safe to Push)

- `worker/.dev.vars.example` - Template without real keys
- `frontend/.env.example` - Template for optional config
- All source code
- Configuration files

## Common Issues & Solutions

### Issue: Frontend can't connect to backend
**Solution**: Make sure the worker is running on port 8787:
```bash
cd worker && npm run dev
```

### Issue: "Missing API key" errors
**Solution**: Check that `.dev.vars` exists and has all required keys:
```bash
cat worker/.dev.vars
```

### Issue: TypeScript errors
**Solution**: Rebuild both projects:
```bash
cd worker && npm run type-check
cd ../frontend && npm run build
```

### Issue: Wrangler authentication errors
**Solution**: You don't need to authenticate with Cloudflare for local dev. Just use `.dev.vars`.

## Development Workflow

### Making Changes

1. Make code changes in either `worker/` or `frontend/`
2. Both dev servers have hot reload - changes appear automatically
3. Test your changes locally
4. Commit and push to GitHub

### Testing the Full Flow

1. Start both servers (worker + frontend)
2. Open http://localhost:5173
3. Sign up for an account (local Durable Object storage)
4. Create a story or song to test AI integrations
5. Check terminal logs for any errors

### Building for Production

Frontend:
```bash
cd frontend && npm run build
```

Worker (deploy):
```bash
cd worker && npm run deploy
```

## API Keys Usage

### During Local Development

- **Gemini API**: Story/song generation
- **ElevenLabs API**: Text-to-speech and music generation
- **JWT Secret**: Authentication tokens

All API calls from local dev use YOUR API keys from `.dev.vars`.

### During Production

The deployed app uses separate production secrets configured in Cloudflare.
Your local keys are never deployed or shared.

## Sharing with Teammates

When sharing this project:

1. ✅ **DO**: Push all code to GitHub
2. ✅ **DO**: Share this LOCAL_DEVELOPMENT.md guide
3. ✅ **DO**: Tell teammates to create their own `.dev.vars`
4. ❌ **DON'T**: Share your `.dev.vars` file (contains your API keys)
5. ❌ **DON'T**: Commit API keys to git

Each teammate should get their own API keys from Google and ElevenLabs.

## Need Help?

- Check README.md for project overview
- Check DEPLOYMENT.md for production deployment
- Check TESTING_RESULTS.md for API testing examples

## Summary Commands

Start everything:
```bash
# Terminal 1 - Backend
cd worker && npm run dev

# Terminal 2 - Frontend  
cd frontend && npm run dev

# Open browser
open http://localhost:5173
```

That's it! Your local TaleWeaver is ready to go. 🚀
