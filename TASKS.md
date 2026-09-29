# ImageLite Development Tasks

Legend:

- `[ ]` not started
- `[~]` in progress
- `[x]` completed
- `[!]` blocked

## Phase 0 — Foundation

- [x] 0.1 Initialize Vue 3 + Vite + TypeScript
- [x] 0.2 Enable strict TypeScript
- [x] 0.3 Install/configure Pinia
- [x] 0.4 Install/configure Vue Router
- [x] 0.5 Install/configure Naive UI
- [x] 0.6 Configure ESLint
- [x] 0.7 Configure Prettier
- [x] 0.8 Configure Vitest
- [x] 0.9 Configure Playwright
- [x] 0.10 Create source directory structure
- [x] 0.11 Create README.md
- [x] 0.12 Create PRODUCT.md / ARCHITECTURE.md / DEVELOPMENT.md / TASKS.md
- [x] 0.13 Add typecheck/lint/test/build scripts

## Phase 1 — UI Shell

- [x] 1.1 App shell
- [x] 1.2 Header
- [x] 1.3 Empty state
- [x] 1.4 Upload zone
- [x] 1.5 File picker
- [x] 1.6 Drag-and-drop
- [x] 1.7 Image queue
- [x] 1.8 Image card
- [x] 1.9 Responsive editor layout

## Phase 2 — Image Core

- [ ] 2.1 File validation
- [ ] 2.2 Image decode
- [ ] 2.3 Image metadata/dimensions
- [ ] 2.4 Resize calculation
- [ ] 2.5 Canvas resizer
- [ ] 2.6 JPEG encoder
- [ ] 2.7 PNG encoder
- [ ] 2.8 WebP encoder
- [ ] 2.9 Encoder registry
- [ ] 2.10 Image processor service
- [ ] 2.11 Compression statistics
- [ ] 2.12 Download service

## Phase 3 — Worker

- [ ] 3.1 Worker request/response types
- [ ] 3.2 Worker processor
- [ ] 3.3 Progress reporting
- [ ] 3.4 Error propagation
- [ ] 3.5 Cancellation
- [ ] 3.6 Resource cleanup
- [ ] 3.7 Integrate Worker with UI

## Phase 4 — Batch

- [ ] 4.1 Batch queue
- [ ] 4.2 Bounded concurrency
- [ ] 4.3 Per-image progress
- [ ] 4.4 Aggregate progress
- [ ] 4.5 Per-image errors
- [ ] 4.6 Process all
- [ ] 4.7 ZIP generation
- [ ] 4.8 Download all
- [ ] 4.9 Batch summary

## Phase 5 — Preview

- [ ] 5.1 Original preview
- [ ] 5.2 Output preview
- [ ] 5.3 Before/After
- [ ] 5.4 Comparison slider
- [ ] 5.5 Debounced preview
- [ ] 5.6 Preview resource cleanup

## Phase 6 — Advanced Image Processing

- [ ] 6.1 EXIF orientation
- [ ] 6.2 Metadata policy
- [ ] 6.3 AVIF adapter
- [ ] 6.4 WASM encoder abstraction if needed
- [ ] 6.5 Encoder capability detection
- [ ] 6.6 Browser fallback behavior

## Phase 7 — Target Size

- [ ] 7.1 Target-size settings model
- [ ] 7.2 Candidate encoding
- [ ] 7.3 Quality binary search
- [ ] 7.4 Dimension fallback
- [ ] 7.5 Best-effort result
- [ ] 7.6 Target-size UI
- [ ] 7.7 Explain impossible targets

## Phase 8 — UX / Accessibility / i18n

- [ ] 8.1 Keyboard navigation
- [ ] 8.2 ARIA labels
- [ ] 8.3 Focus management
- [ ] 8.4 Error announcements
- [ ] 8.5 Chinese locale
- [ ] 8.6 English locale
- [ ] 8.7 Japanese locale
- [ ] 8.8 Theme support
- [ ] 8.9 Mobile polish

## Phase 9 — Performance

- [ ] 9.1 Benchmark small images
- [ ] 9.2 Benchmark 10 MB images
- [ ] 9.3 Benchmark 50 MB images
- [ ] 9.4 Benchmark large dimensions
- [ ] 9.5 Memory lifecycle audit
- [ ] 9.6 Worker concurrency tuning
- [ ] 9.7 Preview optimization
- [ ] 9.8 Production bundle analysis

## Phase 10 — PWA / Release

- [ ] 10.1 Manifest
- [ ] 10.2 Service Worker
- [ ] 10.3 Offline shell
- [ ] 10.4 No image caching
- [ ] 10.5 Production deployment
- [ ] 10.6 Browser matrix test
- [ ] 10.7 Mobile test
- [ ] 10.8 Final security review
- [ ] 10.9 Final privacy review
- [ ] 10.10 Release checklist
