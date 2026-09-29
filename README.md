# ImageLite

Privacy-first browser image compression, resizing, and conversion. **Your images never leave your device.**

## Features

- 100% local, browser-based processing (no upload, no server)
- Resize with aspect-ratio control and optional upscaling
- JPEG / PNG / WebP output, AVIF where the browser supports it
- Quality control and best-effort **target file size** search
- Batch processing with bounded concurrency + **ZIP download**
- Live preview and draggable **Before/After** comparison
- EXIF orientation normalization
- **Offline-capable PWA** (installable app shell; image bytes are never cached)
- Dark / light theme, English / 简体中文 / 日本語
- Accessible: keyboard-operable, screen-reader labels, visible focus

## Development

```bash
npm install
npm run dev
```

Checks:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

E2E tests:

```bash
npx playwright install
npm run test:e2e        # app flows (dev server)
npm run test:e2e:pwa    # PWA/offline flows (production build + preview)
```

## PWA

The app registers a service worker (`public/sw.js`) that precaches the
static application shell at build time, so the whole UI works offline on
first install. **Privacy rule:** only shell assets (HTML/JS/CSS/icons) are
cached — user image bytes are never intercepted, cached, or transmitted.

## Deployment (GitHub Pages)

`.github/workflows/deploy.yml` builds and deploys to GitHub Pages on every
push to `main` (typecheck + lint + tests + build, then publish `dist/`).

One-time setup:

1. Push this repository to GitHub (e.g. `image-lite`).
2. In the repo: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Push to `main` (or run the workflow manually) — the site goes live at
   `https://<user>.github.io/<repo>/`.

The build base path is set automatically from the repository name
(`VITE_BASE=/<repo>/`). For a `<user>.github.io` root site (or a custom
domain), the workflow detects that and builds with base `/`. `dist/404.html`
is generated as the SPA fallback for deep links.

## Documentation

- `PRODUCT.md` — product requirements
- `ARCHITECTURE.md` — technical architecture (incl. Phase 9 perf audit)
- `DEVELOPMENT.md` — coding/AI Agent rules
- `TASKS.md` — implementation checklist
- `AGENT_PROMPTS.md` — phase-by-phase prompts

## Privacy

Image decoding, resizing, encoding, preview, and ZIP creation all run
locally in your browser (in a Web Worker where available). There are no
accounts, no analytics, and no network calls carrying image data.
