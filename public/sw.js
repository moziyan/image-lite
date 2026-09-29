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

const VERSION = 'imagelite-v1'
const SHELL_CACHE = `${VERSION}-shell`

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
].map((u) => (u.startsWith('/') ? u : `/${u}`))

function isStaticAsset(url) {
  return (
    url.pathname.startsWith('/assets/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname === '/favicon.svg' ||
    url.pathname === '/manifest.webmanifest'
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
  // (fetch('/') has mode 'cors', not 'navigate', but still wants the shell).
  const wantsHtml =
    request.mode === 'navigate' ||
    dest === 'document' ||
    (url.origin === self.location.origin &&
      (url.pathname === '/' || url.pathname === '/index.html'))
  if (wantsHtml) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          caches.open(SHELL_CACHE).then((cache) => cache.put('/index.html', copy))
          return response
        })
        .catch(() => caches.match('/index.html').then((cached) => cached || caches.match('/'))),
    )
    return
  }

  // Static assets: cache-first for fast repeat loads and offline use.
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone()
              caches.open(SHELL_CACHE).then((cache) => cache.put(request, copy))
            }
            return response
          }),
      ),
    )
    return
  }

  // Default: passthrough (no caching).
})
