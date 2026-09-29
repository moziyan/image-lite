import { describe, expect, it } from 'vitest'

import { i18n, SUPPORTED_LOCALES } from '@/locales'
import enUS from '@/locales/en-US'
import jaJP from '@/locales/ja-JP'
import zhCN from '@/locales/zh-CN'

function keysOf(obj: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([key, value]) =>
    value !== null && typeof value === 'object'
      ? keysOf(value as Record<string, unknown>, `${prefix}${key}.`)
      : [`${prefix}${key}`],
  )
}

describe('i18n locales', () => {
  it('exposes the three required locales', () => {
    expect(SUPPORTED_LOCALES.map((l) => l.value)).toEqual(['en-US', 'zh-CN', 'ja-JP'])
  })

  it('zh-CN and ja-JP have exactly the same keys as en-US', () => {
    const enKeys = keysOf(enUS as unknown as Record<string, unknown>).sort()
    const zhKeys = keysOf(zhCN as unknown as Record<string, unknown>).sort()
    const jaKeys = keysOf(jaJP as unknown as Record<string, unknown>).sort()
    expect(zhKeys).toEqual(enKeys)
    expect(jaKeys).toEqual(enKeys)
  })

  it('every message is a non-empty string in every locale', () => {
    for (const locale of [enUS, zhCN, jaJP]) {
      for (const key of keysOf(locale as unknown as Record<string, unknown>)) {
        const value = key.split('.').reduce<unknown>((acc, part) => {
          return (acc as Record<string, unknown>)[part]
        }, locale)
        expect(typeof value, `${key} must be a string`).toBe('string')
        expect((value as string).length, `${key} must not be empty`).toBeGreaterThan(0)
      }
    }
  })

  it('translates a known key in each locale', async () => {
    const { t } = i18n.global
    const { setLocale } = await import('@/locales')

    await setLocale('en-US')
    expect(t('header.clearAll')).toBe('Clear all')
    await setLocale('zh-CN')
    expect(t('header.clearAll')).toBe('全部清除')
    await setLocale('ja-JP')
    expect(t('header.clearAll')).toBe('すべてクリア')
    await setLocale('en-US')
  })

  it('interpolates parameters', async () => {
    const { t } = i18n.global
    const { setLocale } = await import('@/locales')
    await setLocale('en-US')
    expect(t('queue.select', { name: 'a.png' })).toBe('Select a.png')
  })
})
