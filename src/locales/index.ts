import { createI18n } from 'vue-i18n'

import enUS from './en-US'

export const SUPPORTED_LOCALES = [
  { value: 'en-US', label: 'English' },
  { value: 'zh-CN', label: '简体中文' },
  { value: 'ja-JP', label: '日本語' },
] as const

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]['value']

const STORAGE_KEY = 'imagelite-locale'

function detectLocale(): SupportedLocale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'en-US' || stored === 'zh-CN' || stored === 'ja-JP') return stored
  } catch {
    // localStorage may be unavailable (private mode); fall through.
  }
  const nav = navigator.language
  if (nav.startsWith('zh')) return 'zh-CN'
  if (nav.startsWith('ja')) return 'ja-JP'
  return 'en-US'
}

export function persistLocale(locale: SupportedLocale): void {
  try {
    localStorage.setItem(STORAGE_KEY, locale)
  } catch {
    // ignore persistence failures
  }
}

const initialLocale = detectLocale()
document.documentElement.lang = initialLocale

export const i18n = createI18n({
  legacy: false,
  locale: initialLocale,
  fallbackLocale: 'en-US',
  messages: {
    'en-US': enUS,
  },
})

const loadedLocales = new Set<SupportedLocale>(['en-US'])

/** Load a locale's messages on demand, then activate it. */
export async function setLocale(locale: SupportedLocale): Promise<void> {
  if (!loadedLocales.has(locale)) {
    const messages =
      locale === 'zh-CN'
        ? (await import('./zh-CN')).default
        : (await import('./ja-JP')).default
    i18n.global.setLocaleMessage(locale as 'en-US', messages)
    loadedLocales.add(locale)
  }
  // The schema is keyed by the bundled 'en-US'; other locales are loaded
  // dynamically, so cast to widen the writable locale type.
  ;(i18n.global.locale as unknown as { value: SupportedLocale }).value = locale
  persistLocale(locale)
  document.documentElement.lang = locale
}

// Pre-load the detected locale if it isn't the bundled default.
if (initialLocale !== 'en-US') {
  void setLocale(initialLocale)
}
