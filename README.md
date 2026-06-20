# UnFry

Local activity sensing → forced micro-breaks → context-aware learning.

The Chrome extension is the **sensor + intervention surface**. The Next.js app is the
**brain + dashboard**. Gemini is called only at break-trigger moments. The embedding
classifier runs **100% locally** (WebGPU/WASM) and never leaves the browser.

```
unfry/
├── extension/        MV3 Chrome extension (Vite + React)
└── web/              Next.js app (API routes + dashboard + Drizzle/Postgres)
```

## Quick start

### 1. Web app
```bash
cd web
cp .env.example .env.local        # fill in DATABASE_URL + GEMINI_API_KEY
npm install
npm run db:push                   # create tables
npm run dev                       # http://localhost:3000
```

### 2. Extension
```bash
cd extension
npm install
npm run build                     # outputs to extension/dist
```
Then in Chrome: `chrome://extensions` → enable Developer mode → **Load unpacked** → select `extension/dist`.

Set `WEB_APP_URL` in `extension/src/config.ts` to your web app origin (default `http://localhost:3000`).

## The loop
1. Content script scrapes `{title, url, h1/h2}` per tab focus / every 15s.
2. Background worker runs the **local embedding classifier** → `{category, confidence, intensity}`.
3. `CognitiveLoadTracker` accumulates an intensity-weighted, decaying load score.
4. When the score or high-intensity streak crosses a threshold → break event.
5. Background calls `/api/challenge/generate` → Gemini Flash returns a strict-JSON card.
6. Glassmorphic overlay is injected into the active tab. Outcome syncs to Postgres.

## Demo safety
`/api/challenge/generate` falls back to a local bank if Gemini errors or exceeds ~3s,
so judges never see a spinner.

## Break toys (dashboard)
The dashboard includes three offline sensory toys (`web/app/dashboard/toys/`): a Zen
sand raker, a 16x16 pentatonic Tone Matrix (Tone.js, lazy-loaded on first tap), and a
falling-sand sandbox. All run 100% client-side — no scores, timers, fail states, or
network calls. Tone Matrix reads `dominantCategory` to pick a mood synth (ambient bell
for coding/auditing, crisp pluck otherwise).

## Solo-build cut list (48hr)
- Drop `web/` entirely; keep everything in `chrome.storage.local`.
- Call Gemini directly from the background worker.
- Dashboard becomes a single extension page reading local data.
