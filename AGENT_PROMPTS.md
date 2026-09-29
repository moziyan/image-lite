# ImageLite AI Agent Prompts

Use these prompts one at a time. Do not ask the agent to implement multiple unrelated phases in one turn.

---

## Global Agent Prompt

```text
You are the coding agent for ImageLite.

Before changing code, read:
1. PRODUCT.md
2. ARCHITECTURE.md
3. DEVELOPMENT.md
4. TASKS.md
5. Existing source code
6. Existing tests
7. Current git status/diff

ImageLite is a Vue 3 + TypeScript browser-based image compression tool.

Core constraints:
- Images are processed locally in the browser.
- Do not upload image bytes to a backend.
- UI and image processing must remain separated.
- Heavy processing belongs in Web Workers.
- Encoders must be behind an adapter/interface.
- Pinia stores application state, not Canvas or encoding logic.
- Use strict TypeScript.
- Avoid any unless explicitly justified.
- Centralize limits/configuration.
- Release ImageBitmap and ObjectURL resources.
- Do not add unrelated features.
- Do not perform broad refactors unless necessary for the current task.

For the requested task:
1. Inspect existing implementation.
2. Identify the smallest correct implementation.
3. Implement it.
4. Add/update tests.
5. Run typecheck.
6. Run lint.
7. Run relevant tests.
8. Run production build.
9. Update documentation if public behavior or architecture changed.

Never claim success without running the relevant checks.

At the end report:
- Completed
- Files changed
- Tests
- Build
- Known issues
- Next task
```

---

# Phase 0 Prompts

## 0.1 Project Foundation

```text
Execute ImageLite Phase 0.

Initialize the project with:
- Vue 3
- Vite
- TypeScript
- strict TypeScript
- Pinia
- Vue Router
- Naive UI
- ESLint
- Prettier
- Vitest
- Playwright

Create the directory structure described in ARCHITECTURE.md.

Create:
- README.md
- PRODUCT.md
- ARCHITECTURE.md
- DEVELOPMENT.md
- TASKS.md

Add scripts for:
- dev
- build
- typecheck
- lint
- test

Do not implement image processing yet.

Run all available checks and fix configuration errors.
```

## 0.2 Verify Foundation

```text
Audit the Phase 0 project.

Do not add features.

Verify:
- strict TypeScript
- Vite build
- Vue startup
- Pinia registration
- Router registration
- Naive UI registration
- ESLint
- Prettier
- Vitest
- Playwright configuration

Fix only foundation issues.

Run typecheck, lint, tests, and build.
```

---

# Phase 1 Prompts

## 1.1 App Shell

```text
Implement ImageLite Phase 1.1.

Create the application shell:
- Header
- main content area
- responsive container
- empty state
- basic editor layout

Do not implement image processing.

The UI should look like a finished utility, not a raw scaffold.

Keep components small and focused.
```

## 1.2 Upload

```text
Implement ImageLite upload flow.

Requirements:
- click to select
- drag and drop
- multiple files
- accept JPEG/JPG/PNG/WebP
- reject unsupported files
- show clear errors
- do not process images yet
- add files to the application queue

Add tests for file validation.
```

## 1.3 Image Queue

```text
Implement the image queue.

Each item should display:
- thumbnail if safe/available
- filename
- dimensions when available
- file size
- remove action
- selected state

Keep image-processing logic out of components.

Add empty, populated, and error states.
```

---

# Phase 2 Prompts

## 2.1 Decode

```text
Implement the image decode service.

Requirements:
- accept File
- validate image type
- decode using browser-native APIs where appropriate
- return dimensions
- handle invalid images
- expose typed errors

Do not add Worker support yet unless required by the current architecture.

Add unit/integration tests.
```

## 2.2 Resize

```text
Implement ResizeService according to ARCHITECTURE.md.

Requirements:
- width
- height
- maintainAspectRatio
- allowUpscale
- maximum bounds behavior
- prevent zero/negative dimensions
- preserve aspect ratio correctly

Implement pure dimension calculation separately from actual Canvas resizing.

Add thorough unit tests for:
- width only
- height only
- both bounds
- no upscale
- upscale allowed
- invalid dimensions
```

## 2.3 Encoders

```text
Implement the ImageEncoder abstraction and MVP encoders:
- JPEG
- PNG
- WebP

Rules:
- JPEG/WebP support quality
- PNG must not use JPEG-style lossy quality semantics
- encoders must not import Vue
- encoders must not be called directly by UI components

Create an encoder registry/factory.

Add tests for capability selection and invalid configuration.
```

## 2.4 Image Processor

```text
Implement ImageProcessor.

Pipeline:
File
-> validate
-> decode
-> resize
-> encode
-> result statistics

Return:
- blob
- dimensions
- format
- output size
- original size
- compression ratio
- processing time

Keep the API independent of Vue.

Add tests.
```

## 2.5 Download

```text
Implement DownloadService.

Requirements:
- download Blob
- safe output filename
- preserve base name
- append -compressed
- use correct extension
- avoid unsafe filename handling

Add tests for filename generation.
```

---

# Phase 3 Prompts

## 3.1 Worker

```text
Move expensive image processing into a Web Worker.

Implement:
- typed WorkerRequest
- typed WorkerResponse
- process message
- progress message
- success message
- error message
- cancel message

Do not move UI state into the Worker.

The main thread should communicate with the Worker through a typed service.
```

## 3.2 Resource Lifecycle

```text
Audit Worker and image-processing resource management.

Verify:
- ImageBitmap.close()
- URL.revokeObjectURL()
- no duplicate full-resolution buffers
- worker termination/reuse behavior
- cancelled tasks release resources
- errors release resources

Add tests where possible and document lifecycle decisions.
```

## 3.3 Cancellation

```text
Implement processing cancellation.

Requirements:
- user can cancel an active task
- UI reflects cancelled state
- Worker stops work as early as practical
- cancelled results are not committed
- resources are released

Add tests for cancellation state transitions.
```

---

# Phase 4 Prompts

## 4.1 Batch Processing

```text
Implement BatchProcessor.

Requirements:
- process multiple ImageItems
- bounded concurrency
- per-image progress
- aggregate progress
- individual error isolation
- cancellation
- final summary

Default concurrency should be conservative, around 1-2 tasks.

Do not decode the entire batch into memory at once.
```

## 4.2 ZIP

```text
Implement ZIP download for completed batch results.

Requirements:
- include successful results
- skip failed/cancelled results
- safe unique filenames
- do not add original files
- show meaningful error if there are no successful results

Add integration tests.
```

---

# Phase 5 Prompts

## 5.1 Preview

```text
Implement original and output image preview.

Requirements:
- original preview from File
- output preview from Blob
- object URL lifecycle management
- no unnecessary re-encoding for display

Audit memory cleanup.
```

## 5.2 Before/After

```text
Implement Before/After comparison.

Use a draggable divider.

Requirements:
- same image viewport
- original on one side
- processed result on the other
- keyboard-accessible alternative/control
- no re-encoding during dragging
- responsive behavior
```

## 5.3 Preview Debounce

```text
Implement debounced preview processing for resize/quality changes.

Requirements:
- debounce approximately 150-300ms
- preview may use reduced dimensions
- production output is generated only on explicit processing
- cancel stale preview jobs
- do not allow preview jobs to accumulate
```

---

# Phase 6 Prompts

## 6.1 EXIF Orientation

```text
Implement EXIF orientation normalization.

Requirements:
- detect supported orientation information
- render the visual orientation correctly
- do not unexpectedly rotate already-normalized images
- isolate metadata parsing from Vue
- add fixture-based tests
```

## 6.2 Metadata Policy

```text
Implement metadata policy.

Support:
- preserve EXIF when technically supported
- remove metadata by default if preservation cannot be guaranteed
- document browser/codec limitations

Do not claim metadata preservation unless verified.
```

## 6.3 AVIF

```text
Implement AVIF through the existing encoder abstraction.

Requirements:
- no Vue dependency in encoder
- capability detection
- graceful unsupported-browser behavior
- consistent ImageEncoder API
- tests for registry selection

If a WASM dependency is required, justify it before adding it.
```

---

# Phase 7 Prompts

## 7.1 Target Size Model

```text
Implement target-size configuration.

Example:
target = 500 KB

Add typed settings:
- targetBytes
- allowResize
- minimumQuality
- minimumWidth/height where needed

Do not implement search yet.
```

## 7.2 Target Size Search

```text
Implement best-effort target-size search.

Strategy:
1. Start from the requested dimensions.
2. Encode candidate.
3. Measure actual bytes.
4. Binary-search quality when applicable.
5. If quality floor is insufficient, reduce dimensions.
6. Stop after bounded attempts.
7. Return the closest valid result.

Never claim exact target size unless achieved.

Add deterministic tests for the search algorithm using a mock encoder.
```

---

# Phase 8 Prompts

## 8.1 Accessibility

```text
Perform an accessibility pass.

Verify:
- keyboard upload
- keyboard controls
- focus states
- labels
- slider accessibility
- error announcements
- button names
- dialog semantics if used

Fix issues without changing core architecture.
```

## 8.2 i18n

```text
Introduce i18n architecture.

Locales:
- zh-CN
- en-US
- ja-JP

Move user-visible strings out of components.

Do not translate technical/logging messages unless they are user-facing.
```

## 8.3 Mobile

```text
Perform a mobile UX pass.

Test narrow widths.

Fix:
- overflow
- touch target size
- preview sizing
- settings layout
- image queue behavior
- buttons
- long filenames

Do not create a separate mobile application.
```

---

# Phase 9 Prompts

## 9.1 Performance Audit

```text
Perform a performance audit.

Test representative images:
- 2 MB
- 5 MB
- 10 MB
- 20 MB
- 50 MB

Measure:
- decode
- resize
- encode
- total time
- UI responsiveness

Do not optimize blindly. Identify bottlenecks first.
```

## 9.2 Memory Audit

```text
Perform a memory/resource audit.

Inspect:
- File references
- ImageBitmap
- Canvas
- Blob
- ObjectURL
- Worker
- preview lifecycle
- batch processing

Fix leaks and unnecessary copies.

Do not reduce quality or correctness merely to improve memory numbers.
```

---

# Phase 10 Prompts

## 10.1 PWA

```text
Implement PWA support.

Requirements:
- manifest
- installability
- service worker
- offline application shell

Never cache user image bytes.

Verify that image processing continues to work offline after the application shell is cached.
```

## 10.2 Release Audit

```text
Perform the final ImageLite release audit.

Check:
- typecheck
- lint
- unit tests
- integration tests
- E2E tests
- production build
- browser compatibility
- mobile layout
- accessibility
- privacy
- memory lifecycle
- Worker cancellation
- large-image limits
- download behavior
- ZIP behavior

Do not introduce new features.

Produce a release checklist with PASS/FAIL and evidence.
```

---

# Final Agent Prompt

```text
The implementation is feature-complete.

Do a final codebase review against:
- PRODUCT.md
- ARCHITECTURE.md
- DEVELOPMENT.md
- TASKS.md

Do not add features.

Find:
- architecture violations
- dead code
- unused dependencies
- resource leaks
- incorrect error states
- accessibility regressions
- browser compatibility risks
- privacy violations
- missing tests
- documentation drift

Fix only confirmed issues.

Run:
- typecheck
- lint
- full tests
- E2E
- build

Then provide a release-readiness report.
```
