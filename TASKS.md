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

- [x] 2.1 File validation
- [x] 2.2 Image decode
- [x] 2.3 Image metadata/dimensions
- [x] 2.4 Resize calculation
- [x] 2.5 Canvas resizer
- [x] 2.6 JPEG encoder
- [x] 2.7 PNG encoder
- [x] 2.8 WebP encoder
- [x] 2.9 Encoder registry
- [x] 2.10 Image processor service
- [x] 2.11 Compression statistics
- [x] 2.12 Download service

## Phase 3 — Worker

- [x] 3.1 Worker request/response types
- [x] 3.2 Worker processor
- [x] 3.3 Progress reporting
- [x] 3.4 Error propagation
- [x] 3.5 Cancellation
- [x] 3.6 Resource cleanup
- [x] 3.7 Integrate Worker with UI

## Phase 4 — Batch

- [x] 4.1 Batch queue
- [x] 4.2 Bounded concurrency
- [x] 4.3 Per-image progress
- [x] 4.4 Aggregate progress
- [x] 4.5 Per-image errors
- [x] 4.6 Process all
- [x] 4.7 ZIP generation
- [x] 4.8 Download all
- [x] 4.9 Batch summary

## Phase 5 — Preview

- [x] 5.1 Original preview
- [x] 5.2 Output preview
- [x] 5.3 Before/After
- [x] 5.4 Comparison slider
- [x] 5.5 Debounced preview
- [x] 5.6 Preview resource cleanup

## Phase 6 — Advanced Image Processing

- [x] 6.1 EXIF orientation
- [x] 6.2 Metadata policy
- [x] 6.3 AVIF adapter
- [x] 6.4 WASM encoder abstraction if needed
- [x] 6.5 Encoder capability detection
- [x] 6.6 Browser fallback behavior

## Phase 7 — Target Size

- [x] 7.1 Target-size settings model
- [x] 7.2 Candidate encoding
- [x] 7.3 Quality binary search
- [x] 7.4 Dimension fallback
- [x] 7.5 Best-effort result
- [x] 7.6 Target-size UI
- [x] 7.7 Explain impossible targets

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
