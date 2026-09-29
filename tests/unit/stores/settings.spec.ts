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

  it('target size defaults to disabled with sane floors', () => {
    const settings = useSettingsStore()
    expect(settings.targetSize.enabled).toBe(false)
    expect(settings.targetSizeApplicable).toBe(false)
    expect(settings.targetSize.minimumQuality).toBe(30)
    expect(settings.targetSize.minWidth).toBe(64)
  })

  it('clamps target-size inputs to sane ranges', () => {
    const settings = useSettingsStore()
    settings.setTargetSize({ targetBytes: 1 }) // below the 1 KB floor
    expect(settings.targetSize.targetBytes).toBe(1024)
    settings.setTargetSize({ minimumQuality: 500 })
    expect(settings.targetSize.minimumQuality).toBe(100)
    settings.setTargetSize({ minimumQuality: -5 })
    expect(settings.targetSize.minimumQuality).toBe(1)
  })

  it('target size does not apply to PNG (lossless)', () => {
    const settings = useSettingsStore()
    settings.setTargetSize({ enabled: true })
    settings.setFormat('webp')
    expect(settings.targetSizeApplicable).toBe(true)
    settings.setFormat('png')
    expect(settings.targetSizeApplicable).toBe(false)
  })

  it('reset restores target-size defaults', () => {
    const settings = useSettingsStore()
    settings.setTargetSize({ enabled: true, targetBytes: 99 * 1024, minimumQuality: 5 })
    settings.reset()
    expect(settings.targetSize.enabled).toBe(false)
    expect(settings.targetSize.targetBytes).toBe(500 * 1024)
    expect(settings.targetSize.minimumQuality).toBe(30)
  })
})
