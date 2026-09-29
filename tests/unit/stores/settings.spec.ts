import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useSettingsStore } from '@/stores/settings'

vi.mock('@/services/image/capabilities', () => ({
  supportedOutputFormats: vi.fn(),
}))

import { supportedOutputFormats } from '@/services/image/capabilities'

const formatsMock = vi.mocked(supportedOutputFormats)

describe('settings store capabilities', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    formatsMock.mockReset()
  })

  it('treats all formats as available before detection runs', () => {
    const settings = useSettingsStore()
    expect(settings.availableFormats).toBeNull()
    expect(settings.isFormatAvailable('avif')).toBe(true)
  })

  it('gates unavailable formats after detection', async () => {
    formatsMock.mockResolvedValue(['jpeg', 'png', 'webp'])
    const settings = useSettingsStore()

    await settings.detectCapabilities()

    expect(settings.isFormatAvailable('avif')).toBe(false)
    expect(settings.isFormatAvailable('webp')).toBe(true)
  })

  it('falls back from an unavailable active format (graceful degradation)', async () => {
    formatsMock.mockResolvedValue(['jpeg', 'png'])
    const settings = useSettingsStore()
    settings.setFormat('avif')

    await settings.detectCapabilities()

    // webp unavailable -> jpeg is the next preferred fallback
    expect(settings.output.format).toBe('jpeg')
  })

  it('keeps the active format when it is available', async () => {
    formatsMock.mockResolvedValue(['jpeg', 'png', 'webp', 'avif'])
    const settings = useSettingsStore()
    settings.setFormat('webp')

    await settings.detectCapabilities()

    expect(settings.output.format).toBe('webp')
  })

  it('metadata policy defaults to strip (preserveMetadata = false)', () => {
    const settings = useSettingsStore()
    expect(settings.preserveMetadata).toBe(false)
    settings.setPreserveMetadata(true)
    expect(settings.preserveMetadata).toBe(true)
    settings.reset()
    expect(settings.preserveMetadata).toBe(false)
  })
})
