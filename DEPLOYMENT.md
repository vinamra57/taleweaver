# TaleWeaver Deployment Guide

You're ready to deploy! Here's your step-by-step guide for deploying to Cloudflare.

## Prerequisites

- Cloudflare account (already authenticated as vinamra0305@gmail.com)
- API keys configured in worker/.dev.vars
- Frontend builds successfully
- Backend ready to deploy

## Backend Deployment (Cloudflare Workers)

### 1. Set Production Secrets

Before deploying, you need to set your secrets in production:

```bash
cd worker

# Set your API keys
npx wrangler secret put GEMINI_API_KEY
# When prompted, paste: AIzaSyDU_IELVqsJBJkcqS2yOgteSWVEtvx1bdU

npx wrangler secret put ELEVENLABS_API_KEY
# When prompted, paste: sk_d71e0463d7f898b0810cf71e7c790e246d4744331788d9b3

npx wrangler secret put ELEVENLABS_VOICE_ID
# When prompted, paste: Fahco4VZzobUeiPqni1S

npx wrangler secret put JWT_SECRET
# When prompted, paste: WYxKCYvnQ/W3C3T1k6AxT7LCeMZyCV/3uHAWSqFEqWMs4iYbtld0sRHLvyYHJIzC/V5Ta0HZTs2etQvR+DGIpA==
```

### 2. Create R2 Bucket (if not exists)

```bash
npx wrangler r2 bucket create taleweaver-audio
```

### 3. Create KV Namespace (if not exists)

```bash
npx wrangler kv:namespace create "TALEWEAVER_SESSIONS"
# Copy the ID and update wrangler.toml if needed
```

### 4. Deploy Worker

```bash
npm run deploy
```

This will:
- Bundle your Worker code
- Create the Durable Object
- Deploy to Cloudflare's edge network
- Give you a URL like: https://taleweaver-worker.YOUR-SUBDOMAIN.workers.dev

### 5. Note Your Worker URL

After deployment, copy the worker URL. You'll need it for the frontend configuration.

## Frontend Deployment (Cloudflare Pages)

### Option 1: Deploy via Wrangler (Recommended)

```bash
cd frontend

# Update the API URL in src/lib/constants.ts with your worker URL
# Edit: const API_BASE_URL = 'https://taleweaver-worker.YOUR-SUBDOMAIN.workers.dev'

# Build and deploy
npm run build
npx wrangler pages deploy ./dist --project-name=taleweaver
```

### Option 2: Deploy via Cloudflare Dashboard

1. Go to Cloudflare Dashboard > Pages
2. Click "Create a project"
3. Connect to your Git repository OR
4. Upload the `frontend/dist` folder directly

**Build settings:**
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: `frontend`

**Environment variables:**
- `VITE_API_BASE_URL`: Your worker URL from step 5 above

### 6. Configure CORS (Important!)

After deploying, you need to update the worker's CORS settings to allow your frontend domain:

Edit `worker/src/index.ts` and update the CORS headers to include your Pages domain:

```typescript
// Find the CORS middleware and add your domain
'Access-Control-Allow-Origin': 'https://taleweaver.pages.dev'
```

Then redeploy the worker:

```bash
cd worker
npm run deploy
```

## Post-Deployment Checklist

- [ ] Worker deployed successfully
- [ ] Worker URL accessible (test: https://YOUR-WORKER.workers.dev/)
- [ ] All secrets set in production
- [ ] R2 bucket created
- [ ] KV namespace created
- [ ] Frontend built successfully
- [ ] Frontend deployed to Pages
- [ ] Frontend API_BASE_URL updated to worker URL
- [ ] CORS configured correctly
- [ ] Test story creation from frontend
- [ ] Test song generation from frontend
- [ ] Test voice cloning functionality

## Deployment Commands Quick Reference

```bash
# Backend
cd worker
npx wrangler secret put GEMINI_API_KEY
npx wrangler secret put ELEVENLABS_API_KEY
npx wrangler secret put ELEVENLABS_VOICE_ID
npx wrangler secret put JWT_SECRET
npm run deploy

# Frontend
cd frontend
# Update src/lib/constants.ts with worker URL
npm run build
npx wrangler pages deploy ./dist --project-name=taleweaver
```

## Troubleshooting

### Worker deployment fails
- Check that all secrets are set: `npx wrangler secret list`
- Verify wrangler.toml configuration
- Check R2 bucket exists: `npx wrangler r2 bucket list`

### CORS errors in browser
- Verify CORS headers in worker include your Pages domain
- Redeploy worker after updating CORS

### API calls failing
- Check worker logs: `npx wrangler tail`
- Verify environment variables are set correctly
- Test API directly: `curl https://YOUR-WORKER.workers.dev/`

### Frontend not connecting to backend
- Verify API_BASE_URL in src/lib/constants.ts
- Check browser console for errors
- Verify worker is deployed and accessible

## Monitoring

### View Worker Logs
```bash
cd worker
npx wrangler tail
```

### View Worker Analytics
- Go to Cloudflare Dashboard > Workers & Pages
- Click on your worker
- View Metrics tab

## Custom Domain (Optional)

### For Worker:
1. Go to Workers & Pages > taleweaver-worker > Settings > Domains
2. Add custom domain: api.yourdomain.com

### For Pages:
1. Go to Pages > taleweaver > Settings > Domains
2. Add custom domain: yourdomain.com

## Environment-Specific Configurations

### Development
- Worker runs locally: `npm run dev` (uses .dev.vars)
- Frontend runs locally: `npm run dev` (uses localhost:8787)

### Production
- Worker runs on Cloudflare Edge
- Frontend runs on Cloudflare Pages
- Uses production secrets and KV/R2 bindings

## Estimated Costs (Cloudflare Free Tier)

- Workers: 100,000 requests/day (FREE)
- Durable Objects: 1M requests/month (FREE with paid plan)
- R2 Storage: 10 GB/month (FREE)
- KV: 100,000 reads/day, 1,000 writes/day (FREE)
- Pages: Unlimited requests (FREE)

Note: ElevenLabs and Gemini API costs apply separately.

## Success!

Once deployed, your TaleWeaver app will be live at:
- Frontend: https://taleweaver.pages.dev
- Backend API: https://taleweaver-worker.YOUR-SUBDOMAIN.workers.dev

Share your hackathon project URL with the judges!
