# RSPL Listening Warehouse

A social listening intelligence platform built with React, TypeScript, and Vite. Powered by Google Gemini AI for data synthesis and report generation.

## Tech Stack

- **Frontend**: React 19 + TypeScript
- **Build Tool**: Vite 6
- **Styling**: Tailwind CSS (CDN)
- **AI**: Google Gemini API (`@google/genai`)
- **Data**: SheetJS (xlsx) for spreadsheet parsing

## Local Development

```bash
npm install
cp .env.example .env.local
# Edit .env.local and add your Gemini API key
npm run dev
```

The app runs at `http://localhost:3000`.

## Deploy to Vercel via GitHub

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/rspl-listening-warehouse.git
git branch -M main
git push -u origin main
```

### 2. Connect to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click **"Add New Project"**
3. Import the GitHub repository
4. Vercel will auto-detect **Vite** — no config changes needed
5. **Add Environment Variable** before deploying:
   - Key: `GEMINI_API_KEY`
   - Value: Your Google Gemini API key
6. Click **Deploy**

### 3. Environment Variables (Required)

| Variable | Description |
|----------|-------------|
| `GEMINI_API_KEY` | Google Gemini API key for AI-powered synthesis |

> **Important**: The API key is embedded at build time via `vite.config.ts`. After adding/changing the env var in Vercel, trigger a **redeploy** for it to take effect.

## Build

```bash
npm run build    # Output in ./dist
npm run preview  # Preview production build locally
```
