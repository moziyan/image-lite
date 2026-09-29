import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath, URL } from 'node:url'

import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'

/**
 * Inject the build's hashed asset list into the service worker's precache
 * (dist/sw.js) so the full app shell works offline on first install.
 * Only static shell assets are listed — never user image data. jszip is
 * excluded: it is lazy-loaded and cached at runtime only if ZIP is used.
 */
function swPrecachePlugin() {
  return {
    name: 'sw-precache',
    apply: 'build' as const,
    writeBundle(options: { dir?: string }) {
      const outDir = options.dir ?? 'dist'
      const assetsDir = join(outDir, 'assets')
      const assetUrls = readdirSync(assetsDir)
        .filter(
          (name) =>
            (name.endsWith('.js') || name.endsWith('.css')) && !name.includes('jszip'),
        )
        .map((name) => `'assets/${name}'`)

      const swPath = join(outDir, 'sw.js')
      const marker = '/* __PRECACHE_URLS__ */'
      const source = readFileSync(swPath, 'utf-8')
      if (!source.includes(marker)) {
        throw new Error(`sw.js precache marker not found in ${swPath}`)
      }
      writeFileSync(swPath, source.replace(marker, assetUrls.join(',\n  ')))
    },
  }
}

export default defineConfig({
  plugins: [vue(), swPrecachePlugin()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  worker: {
    format: 'es',
  },
  test: {
    environment: 'happy-dom',
    include: ['tests/unit/**/*.spec.ts', 'tests/integration/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**'],
    },
  },
})
