# TaleWeaver

Interactive moral bedtime stories powered by AI - A hackathon project for GROW track.

## Project Structure

```
taleweaver/
├── worker/              # Cloudflare Worker backend (TypeScript + Hono)
├── frontend/            # React frontend (TypeScript + Vite)
├── FRONTEND_INCOMPATIBILITIES.md  # Critical: API schema differences
└── README.md
```

## Backend Status: ✅ 100% COMPLETE

See `worker/VERIFICATION_REPORT.md` for full details.

**What's Ready:**
- ✅ All API endpoints implemented
- ✅ Cloudflare KV + Workers AI configured
- ✅ TypeScript builds with zero errors
- ✅ Full error handling & logging
- ✅ Complete documentation

**Manual Steps Required:**
1. Enable R2 in Cloudflare Dashboard
2. Create R2 bucket: `npx wrangler r2 bucket create taleweaver-audio`
3. Set production secrets (Gemini, ElevenLabs API keys)

See `worker/README.md` for setup instructions.

## Frontend Status: ⚠️ SCHEMA MISMATCH

The frontend has a **different API contract** than the backend. See `FRONTEND_INCOMPATIBILITIES.md` for required fixes.

## Quick Start (Backend)

```bash
cd worker
npm install
npm run dev  # Starts on http://localhost:8787
```

## Tech Stack

**Backend:**
- Cloudflare Workers (Hono framework)
- TypeScript + Zod
- KV (sessions) + R2 (audio) + Workers AI
- Gemini (stories) + ElevenLabs (TTS)

**Frontend:**
- React + TypeScript + Vite
- Tailwind CSS

## Documentation

- `worker/README.md` - Backend setup & API docs
- `worker/VERIFICATION_REPORT.md` - Complete verification
- `FRONTEND_INCOMPATIBILITIES.md` - Frontend fixes needed
