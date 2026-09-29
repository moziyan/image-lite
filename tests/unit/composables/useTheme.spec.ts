import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useTheme } from '@/composables/useTheme'

describe('useTheme', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('dark')
    vi.restoreAllMocks()
  })

  it('defaults to system mode', () => {
    const { mode } = useTheme()
    expect(mode.value).toBe('system')
  })

  it('toggles dark/light and applies the html.dark class', () => {
    const { isDark, setMode } = useTheme()
    setMode('dark')
    expect(isDark.value).toBe(true)
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    setMode('light')
    expect(isDark.value).toBe(false)
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('persists the mode to localStorage', () => {
    const { setMode } = useTheme()
    setMode('dark')
    expect(localStorage.getItem('imagelite-theme')).toBe('dark')
  })
})
