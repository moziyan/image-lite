# ImageLite

Privacy-first browser image compression, resizing, and conversion.

## Core Features

- Local browser processing
- Resize
- JPEG / PNG / WebP
- Batch processing
- ZIP download
- Before/After preview
- Web Worker processing
- Target file size
- PWA

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
npm run test:e2e
```

## Documentation

- `PRODUCT.md` — product requirements
- `ARCHITECTURE.md` — technical architecture
- `DEVELOPMENT.md` — coding/AI Agent rules
- `TASKS.md` — implementation checklist
- `AGENT_PROMPTS.md` — phase-by-phase prompts

## Privacy

The core product is designed so image bytes remain in the browser and are not uploaded to a server.
