# ImageLite Architecture

## 1. Goals

Architecture goals:

- Clear separation of UI and image-processing concerns
- Replaceable codecs
- Worker-based heavy processing
- Testable pure logic
- Controlled memory usage
- Progressive enhancement
- No backend dependency for core image processing

## 2. Stack

- Vue 3
- TypeScript strict mode
- Vite
- Pinia
- Vue Router
- Naive UI
- Vitest
- Playwright
- Web Worker
- Canvas API
- JSZip
- Optional WASM codecs later

## 3. Layering

```text
Vue Components
      |
      v
Composables
      |
      +------> Pinia Store
      |
      v
Application Services
      |
      v
Image Processing Domain
      |
      +------> Decoder
      +------> Resizer
      +------> Encoder
      |
      v
Worker Runtime
```

Rules:

- Components render and emit user intent.
- Composables coordinate UI behavior.
- Stores hold application state.
- Services implement application capabilities.
- Image processors implement image operations.
- Workers execute expensive processing.
- Encoders do not know about Vue.
- Stores do not directly manipulate Canvas.

## 4. Directory Structure

```text
src/
├── assets/
├── components/
│   ├── common/
│   ├── upload/
│   ├── image/
│   ├── settings/
│   └── result/
├── composables/
├── config/
├── constants/
├── locales/
├── router/
├── services/
│   ├── image/
│   ├── download/
│   └── zip/
├── stores/
├── types/
├── utils/
├── workers/
├── views/
├── App.vue
└── main.ts

tests/
├── unit/
├── integration/
├── e2e/
└── fixtures/
```

## 5. Domain Types

```ts
export type ImageStatus = 'pending' | 'processing' | 'completed' | 'error' | 'cancelled'

export type OutputFormat = 'jpeg' | 'png' | 'webp' | 'avif'

export interface ResizeOptions {
  width?: number
  height?: number
  maintainAspectRatio: boolean
  allowUpscale: boolean
}

export interface EncodeOptions {
  format: OutputFormat
  quality?: number
}

export interface ImageProcessInput {
  file: File
  resize: ResizeOptions
  output: EncodeOptions
  metadata: {
    preserveExif: boolean
  }
}

export interface ImageProcessResult {
  blob: Blob
  width: number
  height: number
  format: OutputFormat
  size: number
  originalSize: number
  compressionRatio: number
  processingTime: number
}
```

## 6. Image Processing Pipeline

```text
File
 |
 +--> Validate
 |
 +--> Decode
 |
 +--> Normalize Orientation
 |
 +--> Resize
 |
 +--> Encode
 |
 +--> Blob
 |
 +--> Statistics
 |
 +--> Preview/Download
```

Resize should normally happen before final encoding.

## 7. Encoder Adapter

```ts
export interface ImageEncoder {
  supports(format: OutputFormat): boolean

  encode(source: ImageBitmap | ImageData | HTMLCanvasElement, options: EncodeOptions): Promise<Blob>
}
```

Implementations:

- JpegEncoder
- PngEncoder
- WebpEncoder
- AvifEncoder (canvas-based, no WASM)

The application chooses an encoder through a registry/factory.

### Capability detection & fallbacks

Canvas encoding support is detected by probing a real 1×1 encode
(`services/image/capabilities.ts`), never by UA sniffing. Browsers that
cannot encode a format either throw or silently return a PNG blob — both
are detected. The UI gates format options on the probe result and falls
back (webp → jpeg → png) when the active format is unavailable. AVIF
encoding via canvas requires Chrome 130+; no WASM encoder is bundled
because AVIF is a non-MVP enhancement and the dependency weight is not
justified while native support is rolling out.

### Metadata policy

- **Default: strip.** All output is produced by canvas re-encoding, which
  drops EXIF/XMP/ICC in every current browser.
- **Preserve (opt-in):** best-effort only. The pipeline carries the flag,
  but metadata preservation is *not guaranteed* and the UI says so —
  preservation is never claimed unless verified.
- **EXIF orientation** is not metadata preservation: it is always applied
  at decode time (`createImageBitmap` with `imageOrientation: 'from-image'`)
  so output pixels are in visual orientation. A minimal header parser
  (`services/image/exif.ts`, Vue-free) exposes the orientation tag for
  diagnostics; rotated images get correct dimensions automatically.

## 8. Resizer

```ts
export interface ImageResizer {
  resize(
    source: ImageBitmap,
    options: ResizeOptions,
  ): Promise<ImageBitmap | ImageData | HTMLCanvasElement>
}
```

Initial implementation may use Canvas.

## 9. Decoder

Use browser-native APIs where appropriate:

- `createImageBitmap`
- Image/Blob fallback if needed

Decoder responsibilities:

- Decode
- Report dimensions
- Normalize orientation where supported

## 10. Worker Boundary

Main thread:

- UI
- application state
- user interaction
- object URL display

Worker:

- decode where transferable/supported
- resize
- encode
- progress
- cancellation

Worker messages must use typed discriminated unions.

## 11. Worker Protocol

```ts
type WorkerRequest =
  | {
      type: 'process'
      taskId: string
      payload: ImageProcessInput
    }
  | {
      type: 'cancel'
      taskId: string
    }

type WorkerResponse =
  | {
      type: 'progress'
      taskId: string
      progress: number
    }
  | {
      type: 'success'
      taskId: string
      result: ImageProcessResult
    }
  | {
      type: 'error'
      taskId: string
      error: string
    }
  | {
      type: 'cancelled'
      taskId: string
    }
```

## 12. Store Responsibilities

Pinia should contain:

- Image queue
- Selected image
- Global settings
- Per-image overrides
- Processing state
- Aggregate results

Pinia must not:

- Encode images
- Own Canvas
- Directly manage WASM
- Contain large binary buffers unnecessarily

## 13. Memory Management

Rules:

- Revoke object URLs when no longer needed.
- Call `ImageBitmap.close()` when done.
- Avoid decoding all batch images simultaneously.
- Process with bounded concurrency.
- Do not store redundant full-size image copies.
- Release intermediate Canvas/bitmap references promptly.

## 14. Batch Processing

Initial concurrency:

- 1–2 tasks depending on device capability

A queue should:

- schedule work
- report progress
- support cancellation
- continue after an individual failure when appropriate
- collect per-image errors

## 15. Preview Strategy

Original preview:

- object URL from original File

Output preview:

- object URL from result Blob

Real-time preview:

- use reduced preview dimensions
- debounce changes
- do not run full production encoding for every slider event

## 16. Target Size Strategy

Later implementation:

1. Establish a target dimension range.
2. Encode a candidate.
3. Measure actual bytes.
4. Search quality using binary search where codec behavior permits.
5. If quality floor is insufficient, reduce dimensions.
6. Return closest result and explain if target could not be reached.

Do not claim an exact byte target unless actually achieved.

## 17. Error Model

Convert low-level errors into domain errors:

```ts
type ImageErrorCode =
  | 'UNSUPPORTED_FORMAT'
  | 'INVALID_IMAGE'
  | 'FILE_TOO_LARGE'
  | 'PIXEL_LIMIT_EXCEEDED'
  | 'DECODE_FAILED'
  | 'ENCODE_FAILED'
  | 'OUT_OF_MEMORY'
  | 'CANCELLED'
  | 'UNKNOWN'
```

UI gets a safe user-facing message plus optional developer details.

## 18. Security

Treat all uploaded files as untrusted binary data.

Never:

- inject file names into HTML
- execute uploaded content
- send images to external APIs by default

## 19. Performance

Primary performance constraints:

- Keep UI responsive.
- Avoid unnecessary copies.
- Prefer ImageBitmap.
- Bound concurrency.
- Release resources.
- Use Worker for expensive operations.

Measure:

- decode time
- resize time
- encode time
- total time
- output size
- memory behavior where measurable

## 20. Testing Strategy

Unit:

- dimension calculation
- bytes formatting
- compression percentage
- file naming
- validation
- settings normalization

Integration:

- upload -> process -> result
- batch processing
- cancellation
- errors

E2E:

- real browser upload
- resize
- format selection
- compression
- download

## 21. Architectural Invariants

These should remain true:

1. Vue components do not encode images.
2. Stores do not own Canvas.
3. Encoders do not import Vue.
4. Worker protocol is typed.
5. Limits are centralized.
6. User image bytes are not sent to a backend.
7. Heavy processing does not block the main thread.
8. Object URLs have explicit lifecycle management.
