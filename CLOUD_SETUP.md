# Cloud Setup Guide - Pocketknife

This guide walks you through setting up free cloud infrastructure for Pocketknife.

## Overview

| Service | Provider | Free Tier Limits | Purpose |
|---------|----------|------------------|---------|
| Frontend | Vercel | Unlimited deploys, 100GB bandwidth | React app hosting |
| Backend | Railway | $5/month credit, 512MB RAM | Node.js API |
| Database | Neon | 0.5GB storage, 3 compute hours/day | PostgreSQL |
| Cache | Upstash | 10K commands/day | Redis (optional) |

---

## Step 1: Database Setup (Neon - PostgreSQL)

### 1.1 Create Neon Account

1. Go to [https://neon.tech](https://neon.tech)
2. Click "Sign Up" (use GitHub for easy signup)
3. Verify your email

### 1.2 Create Database

1. Click "Create Project"
2. **Project Name**: `pocketknife`
3. **Region**: Choose closest to your location
4. Click "Create Project"

### 1.3 Get Connection String

1. After project creation, you'll see the connection details
2. Copy the "Connection string" that looks like:
   ```
   postgres://username:password@ep-xxx-xxx-123456.region.aws.neon.tech/neondb?sslmode=require
   ```
3. Save this as your `DATABASE_URL`

### 1.4 Set Up Schema

```bash
# In your backend folder
cd backend

# Set your DATABASE_URL
export DATABASE_URL="your-connection-string-here"

# Push schema to database
npm run db:push

# Seed with initial data
npm run db:seed

# (Optional) Open database GUI
npm run db:studio
```

---

## Step 2: Cache Setup (Upstash Redis - Optional)

### 2.1 Create Upstash Account

1. Go to [https://upstash.com](https://upstash.com)
2. Click "Sign Up" (use GitHub for easy signup)

### 2.2 Create Redis Database

1. Click "Create Database"
2. **Name**: `pocketknife-cache`
3. **Type**: Regional
4. **Region**: Choose closest to your backend (same region as Neon if possible)
5. Click "Create"

### 2.3 Get Connection URL

1. Go to your database details
2. Copy the "Redis URL" that looks like:
   ```
   redis://default:xxx@xxx.upstash.io:6379
   ```
3. Save this as your `REDIS_URL` or `UPSTASH_REDIS_URL`

---

## Step 3: Backend Hosting (Railway)

### 3.1 Create Railway Account

1. Go to [https://railway.app](https://railway.app)
2. Click "Login" and sign up with GitHub

### 3.2 Create Project

1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Connect your GitHub account if not already connected
4. Select your `pocketknife` repository

### 3.3 Configure Service

1. Railway will detect the Dockerfile in `/backend`
2. Click on the service, then "Settings"
3. **Root Directory**: Set to `backend`
4. **Build Command**: (auto-detected from Dockerfile)

### 3.4 Set Environment Variables

Go to "Variables" tab and add:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Your Neon connection string |
| `REDIS_URL` | Your Upstash Redis URL (optional) |
| `ANTHROPIC_API_KEY` | Your Anthropic API key |
| `GOOGLE_CLIENT_ID` | Your Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Your Google OAuth secret |
| `GOOGLE_REDIRECT_URI` | `https://your-backend.railway.app/api/auth/google/callback` |
| `FRONTEND_URL` | Your Vercel frontend URL (set after Step 4) |
| `NODE_ENV` | `production` |
| `PORT` | `5000` |

### 3.5 Deploy

1. Railway will automatically deploy when you push to main
2. Note your backend URL: `https://pocketknife-backend.railway.app`

### 3.6 Get Railway Token (for CI/CD)

1. Go to Account Settings → Tokens
2. Create new token: `pocketknife-deploy`
3. Save this as GitHub Secret: `RAILWAY_TOKEN`

---

## Step 4: Frontend Hosting (Vercel)

### 4.1 Create Vercel Account

1. Go to [https://vercel.com](https://vercel.com)
2. Click "Sign Up" with GitHub

### 4.2 Import Project

1. Click "Add New" → "Project"
2. Import your `pocketknife` repository
3. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

### 4.3 Set Environment Variables

| Variable | Value |
|----------|-------|
| `VITE_API_URL` | Your Railway backend URL (e.g., `https://pocketknife-backend.railway.app`) |
| `VITE_WS_URL` | Same as VITE_API_URL |

### 4.4 Deploy

1. Click "Deploy"
2. Note your frontend URL: `https://pocketknife.vercel.app`

### 4.5 Get Vercel Tokens (for CI/CD)

1. Go to Account Settings → Tokens
2. Create new token and save as: `VERCEL_TOKEN`
3. Go to Team Settings → General → copy Vercel ID as: `VERCEL_ORG_ID`
4. Go to Project Settings → General → copy Project ID as: `VERCEL_PROJECT_ID`

### 4.6 Update Backend CORS

Go back to Railway and update:
- `FRONTEND_URL`: Your Vercel frontend URL

---

## Step 5: GitHub Actions Setup

### 5.1 Add Repository Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions

Add these secrets:

| Secret | Description |
|--------|-------------|
| `RAILWAY_TOKEN` | Railway deploy token |
| `VERCEL_TOKEN` | Vercel deploy token |
| `VERCEL_ORG_ID` | Vercel organization ID |
| `VERCEL_PROJECT_ID` | Vercel project ID |
| `DATABASE_URL` | Neon connection string (for migrations) |

### 5.2 Enable Actions

1. Go to repository → Actions
2. Enable GitHub Actions if not already enabled
3. Push to `main` branch to trigger deployment

---

## Step 6: Run Database Migrations

After first deployment:

```bash
# On your local machine with DATABASE_URL set
cd backend
npm run db:migrate:prod

# Or via Railway CLI
railway run npm run db:migrate:prod
```

---

## Verification Checklist

- [ ] Database created on Neon
- [ ] `npm run db:push` successful
- [ ] Backend deployed on Railway
- [ ] Health check passes: `https://your-backend.railway.app/health`
- [ ] Frontend deployed on Vercel
- [ ] Frontend can reach backend (check browser console)
- [ ] Google OAuth redirect configured with production URLs
- [ ] GitHub Actions workflows enabled

---

## Troubleshooting

### Backend not starting
- Check Railway logs for errors
- Verify all required environment variables are set
- Ensure DATABASE_URL is correct

### Database connection errors
- Verify Neon project is active (not paused due to inactivity)
- Check connection string includes `?sslmode=require`

### Frontend can't reach backend
- Check CORS configuration (FRONTEND_URL env var)
- Verify VITE_API_URL is set correctly in Vercel

### OAuth not working
- Update GOOGLE_REDIRECT_URI to production URL
- Add production URLs to Google Cloud Console authorized redirects

---

## Cost Summary (Free Tier)

| Service | Monthly Cost | Limits |
|---------|--------------|--------|
| Neon | $0 | 0.5GB storage, auto-pause after 5min inactivity |
| Railway | $0 | $5 credit, ~500 hours of small instance |
| Vercel | $0 | Unlimited deploys, 100GB bandwidth |
| Upstash | $0 | 10K commands/day |
| **Total** | **$0** | Suitable for personal/development use |

---

## Recommended VS Code Extensions

For better development experience:

### Database
- **Prisma** (`prisma.prisma`) - Schema highlighting, formatting
- **Database Client** (`cweijan.vscode-database-client2`) - GUI for PostgreSQL

### Cloud/DevOps
- **Railway** (`railway.railway`) - Railway CLI integration
- **Docker** (`ms-azuretools.vscode-docker`) - Dockerfile support
- **GitHub Actions** (`github.vscode-github-actions`) - Workflow editing

### Redis
- **Redis** (`cweijan.vscode-redis-client`) - Redis GUI

### General
- **Thunder Client** (`rangav.vscode-thunder-client`) - API testing
- **GitLens** (`eamodio.gitlens`) - Git integration

Install all at once:
```bash
code --install-extension prisma.prisma
code --install-extension cweijan.vscode-database-client2
code --install-extension ms-azuretools.vscode-docker
code --install-extension github.vscode-github-actions
code --install-extension rangav.vscode-thunder-client
code --install-extension eamodio.gitlens
```




