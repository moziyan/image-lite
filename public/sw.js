/**
 * ImageLite service worker.
 *
 * PRIVACY RULE: this worker only ever caches the static application shell
 * (HTML/JS/CSS/icons/manifest). User image bytes are NEVER cached, stored,
 * or sent anywhere — they flow through the image worker and stay in memory.
 *
 * Strategy:
 * - precache the app shell on install
 * - navigation requests: network-first, falling back to the cached shell
 *   (offline app shell)
 * - static assets (/assets/, /icons/): cache-first, network fallback
 * - everything else (including any blob/data URLs): passthrough, no cache
 */

const VERSION = 'imagelite-v4'
const SHELL_CACHE = `${VERSION}-shell`

/**
 * Base path the SW is scoped to ('/' locally, '/<repo>/' on GitHub Pages).
 * Derived from the SW's own URL so no hard-coded prefix is needed.
 */
const BASE = new URL('./', self.location.href).pathname
const withBase = (u) => (u.startsWith('/') ? BASE + u.slice(1) : BASE + u)

/**
 * Core shell precached at install time.
 * __PRECACHE_URLS__ is replaced at build time with the full asset list
 * (hashed JS/CSS/worker/icons) so the whole app shell works offline on
 * first install — no dependency on a prior online visit.
 */
const SHELL_URLS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.svg',
  /* __PRECACHE_URLS__ */
].map(withBase)

function isStaticAsset(url) {
  const path = url.pathname.startsWith(BASE) ? url.pathname.slice(BASE.length) : null
  if (path === null) return false
  return (
    path.startsWith('assets/') ||
    path.startsWith('icons/') ||
    path === 'favicon.svg' ||
    path === 'manifest.webmanifest'
  )
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_URLS))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== SHELL_CACHE).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event

  // Only handle GET over http(s). blob:/data:/chrome-extension: etc. are
  // left untouched so user image data is never intercepted or cached.
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return

  // Never cache anything that carries image bytes or ranged/user content.
  const dest = request.destination
  if (dest === 'image' || dest === 'video' || dest === 'audio') return

  // SPA shell: real navigations AND same-origin HTML/document requests
  // (fetch(BASE) has mode 'cors', not 'navigate', but still wants the shell).
  // 404.html (the GitHub Pages SPA fallback) is normalized to index.html.
  const indexUrl = withBase('/index.html')
  const notFoundUrl = withBase('/404.html')
  const wantsHtml =
    request.mode === 'navigate' ||
    dest === 'document' ||
    (url.origin === self.location.origin &&
      (url.pathname === BASE || url.pathname === indexUrl || url.pathname === notFoundUrl))
  if (wantsHtml) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          caches.open(SHELL_CACHE).then((cache) => cache.put(indexUrl, copy))
          return response
        })
        .catch(() =>
          caches.match(indexUrl).then((cached) => cached || caches.match(withBase('/'))),
        ),
    )
    return
  }

  // Static assets: network-first (fresh when online), falling back to the
  // precached shell offline. Network-first avoids serving a stale or
  // SW-intercepted script to WebKit module workers, which can fail when a
  // cached Response is replayed for a worker script request.
  if (isStaticAsset(url)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone()
            caches.open(SHELL_CACHE).then((cache) => cache.put(request, copy))
          }
          return response
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match(url.pathname))),
    )
    return
  }

  // Default: passthrough (no caching).
})