# ImageLite Release Checklist

Final audit for the Phase 10 release. Evidence is referenced for each item.

## Build & Static Checks

| # | Check | Result | Evidence |
|---|-------|--------|----------|
| 1 | Typecheck (`vue-tsc`) | ✅ PASS | `npm run typecheck` — no errors |
| 2 | Lint (`eslint`) | ✅ PASS | `npm run lint` — no errors |
| 3 | Format (`prettier`) | ✅ PASS | `npm run format` — clean |
| 4 | Production build | ✅ PASS | `vite build` ✓; main 205 kB gzip, jszip 30 kB lazy, locales ~2 kB lazy, worker 9 kB |

## Tests

| # | Check | Result | Evidence |
|---|-------|--------|----------|
| 5 | Unit + integration | ✅ PASS | 171 passed / 20 files (`npm run test`) |
| 6 | E2E app flows | ✅ PASS | 4 passed (home, i18n, theme) |
| 7 | E2E PWA/offline | ✅ PASS | 4 passed (manifest, SW precache, offline processing, no image caching) |

## Functional

| # | Check | Result | Evidence |
|---|-------|--------|----------|
| 8 | Browser compatibility | ⚠️ PARTIAL | Chromium verified end-to-end (encode/decode/worker/SW). Firefox/Safari use the same standard APIs (`createImageBitmap`, `OffscreenCanvas`, canvas `convertToBlob`); AVIF already gated behind runtime capability detection. No Chromium-only APIs used. Not executed on real Firefox/Safari in this environment. |
| 9 | Mobile layout | ✅ PASS | 375px viewport: header wraps, single-column grid, preview first, no overflow (Phase 8 screenshots) |
| 10 | Accessibility | ✅ PASS | Keyboard upload/select/slider, named buttons, `role=alert` on errors, visible focus; DOM audit confirmed all interactive elements named (PRODUCT §15) |
| 11 | Worker cancellation | ✅ PASS | Cooperative cancel between pipeline stages; cancel during batch verified (Phase 3/4) |
| 12 | Large-image limits | ✅ PASS | 51 MB / 8000×5000 processed; `MAX_FILE_SIZE`/`MAX_PIXELS` enforced with typed errors |
| 13 | Download behavior | ✅ PASS | Per-image download with correct extension; Object URL revoked after use |
| 14 | ZIP behavior | ✅ PASS | 3-entry real ZIP built, name sanitization + dedupe, integrity checked (Phase 4) |

## Privacy & Security

| # | Check | Result | Evidence |
|---|-------|--------|----------|
| 15 | Privacy | ✅ PASS | No `fetch`/XHR/beacon/analytics in `src/`; SW caches only shell assets, never `blob:`/`data:`/image destinations (E2E `never caches user image bytes`) |
| 16 | Memory lifecycle | ✅ PASS | Object URLs revoked on remove/clearAll/regenerate (unit-tested); ImageBitmaps closed; heap stable ~19 MB after 51 MB + 6×10 MB batches |
| 17 | Security | ✅ PASS | File names sanitized for ZIP (Windows-safe, dedupe); no `innerHTML` with user data; metadata stripped by default |

## PWA

| # | Check | Result | Evidence |
|---|-------|--------|----------|
| 18 | Manifest | ✅ PASS | name/short_name/display=standalone/icons 192+512 (maskable variants) |
| 19 | Installability | ✅ PASS | HTTPS/localhost + manifest + SW + icons present |
| 20 | Service worker | ✅ PASS | Build-time precache of full shell; network-first nav with offline fallback |
| 21 | Offline shell | ✅ PASS | Reload + full compress pipeline ran offline (test-red 2.7 KB → 1.4 KB) |

## Notes

- Item 8 is the only non-full PASS: cross-browser execution was limited to
  Chromium in this environment. The code paths are standards-based and the
  riskiest feature (AVIF encode) is already runtime-gated, but a manual
  pass on real Firefox and Safari is recommended before public launch.
