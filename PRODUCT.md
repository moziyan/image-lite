# ImageLite Product Specification

## 1. Overview

ImageLite is a browser-based image compression and conversion tool.

Core promise:

> Compress, resize, and convert images locally in the browser without uploading user images to a server.

Primary users:

- People reducing photo size before upload/share
- Developers/designers optimizing web images
- Users needing exact dimensions or approximate target file size

## 2. Product Principles

1. **Local-first**: image bytes stay in the browser by default.
2. **Privacy-first**: no server-side image upload is required.
3. **Simple by default**: common operations require minimal decisions.
4. **Advanced when needed**: expose format, quality, dimensions, metadata, and target-size controls.
5. **Batch capable**: multiple images should be first-class.
6. **Responsive**: desktop and mobile must both be usable.
7. **Performance aware**: expensive image work runs off the main UI thread.
8. **Progressive enhancement**: browser-native capabilities first; WASM encoders may be added later.

## 3. MVP Scope

### Inputs

- JPEG/JPG
- PNG
- WebP

### Outputs

- JPEG
- PNG
- WebP

### Required features

- Click-to-upload
- Drag-and-drop upload
- Multi-file upload
- Image queue
- Thumbnail preview
- Original dimensions
- Original file size
- Resize by width/height
- Keep aspect ratio
- Prevent upscaling by default
- Quality control for lossy formats
- Format selection
- Compress one image
- Compress all images
- Progress
- Cancellation
- Download one result
- Download all as ZIP
- Compression statistics
- Error states
- Large-image safeguards
- Object URL and ImageBitmap lifecycle management

## 4. Post-MVP Scope

### Phase 5+

- Before/After comparison
- Comparison slider
- Debounced preview generation
- EXIF orientation normalization
- Metadata policy
- AVIF
- Better encoders/WASM
- Target file size
- Automatic parameter search
- Crop/rotate/flip
- PWA/offline support
- i18n
- Accessibility hardening
- Performance profiling

## 5. Non-Goals

Do not add these without a separately approved product change:

- Accounts
- Cloud image storage
- Server-side image processing
- Social features
- AI image generation
- AI enhancement
- Image CDN
- User image database

## 6. User Journey

### First visit

1. User sees what the tool does.
2. User sees that processing is local.
3. User drops or selects images.
4. User enters the editor.
5. User changes size/format/quality.
6. User starts processing.
7. User reviews results.
8. User downloads one or all results.

### Batch journey

1. Add multiple images.
2. Set global processing settings.
3. Optionally override settings for an individual image.
4. Process all.
5. Review aggregate statistics.
6. Download ZIP.

## 7. UI Information Architecture

### Home

- Header
- Product statement
- Upload zone
- Supported formats
- Privacy statement

### Editor

- Header actions
- Image queue
- Preview
- Settings panel
- Compression summary
- Processing actions

### Settings

Later:

- Metadata policy
- Default output format
- Default quality
- Theme
- Language

## 8. Editor Layout

Desktop:

```text
+------------------------------------------------------+
| Header                              Add   Clear       |
+----------------+--------------------+----------------+
|                |                    |                |
| Image Queue    | Image Preview      | Settings       |
|                |                    |                |
| image 1        |                    | Resize         |
| image 2        |                    | Format         |
| image 3        |                    | Quality        |
|                |                    | Summary        |
|                |                    | Compress       |
+----------------+--------------------+----------------+
```

Mobile:

- Preview first
- Settings second
- Queue/result sections below
- Large touch targets

## 9. Resize Semantics

Default:

- Preserve aspect ratio
- Do not upscale

If only width is supplied:

`height = originalHeight * width / originalWidth`

If only height is supplied:

`width = originalWidth * height / originalHeight`

If both are supplied and aspect ratio is enabled:

- Treat them as maximum bounds.
- Fit the image inside the rectangle while preserving aspect ratio.

If both are supplied and aspect ratio is disabled:

- Resize exactly to the requested dimensions.

## 10. Quality Semantics

UI quality is an integer from 0 to 100.

The UI must not assume that a quality value has identical visual meaning across codecs.

JPEG/WebP/AVIF:

- quality applies

PNG:

- do not pretend PNG has the same lossy quality semantics
- use a separate compression/optimization concept when supported

## 11. Format Strategy

MVP:

- JPEG
- PNG
- WebP

Later:

- AVIF

`auto` must be implemented as a strategy/service, not hard-coded in Vue components.

## 12. Statistics

For every processed result:

- Original bytes
- Output bytes
- Original dimensions
- Output dimensions
- Output format
- Processing duration
- Saved bytes
- Saved percentage

If output is larger:

- Say `File increased by X%`
- Never label it as savings

## 13. Privacy

Default behavior:

- No image upload
- No image storage
- No third-party image API
- No image persistence in localStorage

Temporary browser resources must be released.

## 14. Limits

Initial defaults may be:

```ts
MAX_FILE_SIZE = 100 * 1024 * 1024
MAX_PIXELS = 100_000_000
MAX_BATCH_SIZE = 100
```

These are configuration values, not constants scattered through components.

## 15. Accessibility

Required:

- Keyboard-accessible upload
- Keyboard-accessible buttons
- Accessible sliders
- Visible focus states
- Meaningful labels
- Error messages understandable by screen readers
- Drag/drop is never the only upload method

## 16. Browser Support

Target modern:

- Chrome
- Edge
- Firefox
- Safari

When a capability is unavailable:

- Show a useful fallback/error
- Do not crash the application

## 17. Product Success Criteria

The MVP is successful when a user can:

1. Upload a photo.
2. Set a target width.
3. Select WebP or JPEG.
4. Set quality.
5. Process the image.
6. See before/after metadata.
7. Download the result.

Batch success:

1. Upload 20 images.
2. Process them with one configuration.
3. See progress.
4. Cancel if needed.
5. Download a ZIP.
