# ImageLite Release Checklist

Final audit for the Phase 10 release. Evidence is referenced for each item.

## Build & Static Checks

| #   | Check                 | Result  | Evidence                                                                            |
| --- | --------------------- | ------- | ----------------------------------------------------------------------------------- |
| 1   | Typecheck (`vue-tsc`) | ✅ PASS | `npm run typecheck` — no errors                                                     |
| 2   | Lint (`eslint`)       | ✅ PASS | `npm run lint` — no errors                                                          |
| 3   | Format (`prettier`)   | ✅ PASS | `npm run format` — clean                                                            |
| 4   | Production build      | ✅ PASS | `vite build` ✓; main 205 kB gzip, jszip 30 kB lazy, locales ~2 kB lazy, worker 9 kB |

## Tests

| #   | Check              | Result  | Evidence                                                                                             |
| --- | ------------------ | ------- | ---------------------------------------------------------------------------------------------------- |
| 5   | Unit + integration | ✅ PASS | 171 passed / 20 files (`npm run test`)                                                               |
| 6   | E2E app flows      | ✅ PASS | 15 passed = 5 tests × 3 engines (chromium/firefox/webkit): home, compress pipeline, i18n ×2, theme   |
| 7   | E2E PWA/offline    | ✅ PASS | 11 passed + 1 skipped across 3 engines (manifest, SW precache, offline processing, no image caching) |

## Functional

| #   | Check                    | Result  | Evidence                                                                                                                                                                                                                                                                                                                                      |
| --- | ------------------------ | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 8   | Browser compatibility    | ✅ PASS | Full E2E suite green on **chromium, firefox and webkit**: real compress pipeline (upload → worker → statistics), i18n switching, theme toggle, home load. PWA: manifest + SW precache + no-image-caching on all three; offline pipeline on chromium/firefox. AVIF gated behind runtime capability detection. See "Cross-browser notes" below. |
| 9   | Mobile layout            | ✅ PASS | 375px viewport: header wraps, single-column grid, preview first, no overflow (Phase 8 screenshots)                                                                                                                                                                                                                                            |
| 10  | Accessibility            | ✅ PASS | Keyboard upload/select/slider, named buttons, `role=alert` on errors, visible focus; DOM audit confirmed all interactive elements named (PRODUCT §15)                                                                                                                                                                                         |
| 11  | Worker cancellation      | ✅ PASS | Cooperative cancel between pipeline stages; cancel during batch verified (Phase 3/4)                                                                                                                                                                                                                                                          |
| 12  | Large-image limits       | ✅ PASS | 51 MB / 8000×5000 processed; `MAX_FILE_SIZE`/`MAX_PIXELS` enforced with typed errors                                                                                                                                                                                                                                                          |
| 13  | Download behavior        | ✅ PASS | Per-image download with correct extension; Object URL revoked after use                                                                                                                                                                                                                                                                       |
| 13a | Statistics (PRODUCT §12) | ✅ PASS | Result card shows original bytes+dims, output bytes+dims, format, processing duration, saved/increased %. Browser-verified: `Original 5 KB · 1200×900 · Output 2.5 KB · 1200×900 · Time 64 ms`                                                                                                                                                |
| 14  | ZIP behavior             | ✅ PASS | 3-entry real ZIP built, name sanitization + dedupe, integrity checked (Phase 4)                                                                                                                                                                                                                                                               |

## Privacy & Security

| #   | Check            | Result  | Evidence                                                                                                                                               |
| --- | ---------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 15  | Privacy          | ✅ PASS | No `fetch`/XHR/beacon/analytics in `src/`; SW caches only shell assets, never `blob:`/`data:`/image destinations (E2E `never caches user image bytes`) |
| 16  | Memory lifecycle | ✅ PASS | Object URLs revoked on remove/clearAll/regenerate (unit-tested); ImageBitmaps closed; heap stable ~19 MB after 51 MB + 6×10 MB batches                 |
| 17  | Security         | ✅ PASS | File names sanitized for ZIP (Windows-safe, dedupe); no `innerHTML` with user data; metadata stripped by default                                       |

## PWA

| #   | Check          | Result  | Evidence                                                                   |
| --- | -------------- | ------- | -------------------------------------------------------------------------- |
| 18  | Manifest       | ✅ PASS | name/short_name/display=standalone/icons 192+512 (maskable variants)       |
| 19  | Installability | ✅ PASS | HTTPS/localhost + manifest + SW + icons present                            |
| 20  | Service worker | ✅ PASS | Build-time precache of full shell; network-first nav with offline fallback |
| 21  | Offline shell  | ✅ PASS | Reload + full compress pipeline ran offline (test-red 2.7 KB → 1.4 KB)     |

## Cross-browser notes

- The full E2E suite runs on chromium, firefox and webkit (Playwright
  projects). All 5 app tests pass on every engine, including a real
  end-to-end compress through the Web Worker pipeline.
- PWA suite: manifest validity, SW registration + shell precache, and the
  "never cache user image bytes" guard pass on all three engines. The
  offline _processing_ case runs on chromium and firefox.
- **WebKit offline worker caveat:** Playwright's `context.setOffline(true)`
  blocks all worker startup in WebKit (even `blob:` workers), so the
  offline-compress assertion is skipped on webkit — a test-harness
  limitation, not an application defect. WebKit's online compress pipeline
  is covered by the standard E2E suite. Real-network offline behaviour on
  Safari should be spot-checked manually before public launch.
- Service worker uses network-first for static assets and navigation
  (cache fallback offline) so module workers and hashed bundles are never
  served stale across deployments; the precache is versioned
  (`imagelite-v3`) and old caches are purged on activate.
