import { darkTheme, type GlobalTheme } from 'naive-ui'
import { computed, ref } from 'vue'

export type ThemeMode = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'imagelite-theme'

const mode = ref<ThemeMode>(loadMode())
const systemDark = ref(readSystemDark())

function loadMode(): ThemeMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
  } catch {
    // localStorage unavailable; fall through
  }
  return 'system'
}

function readSystemDark(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
}

// Track OS-level changes while in "system" mode.
if (typeof window !== 'undefined') {
  window
    .matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', (event) => (systemDark.value = event.matches))
}

export function useTheme() {
  const isDark = computed(() =>
    mode.value === 'system' ? systemDark.value : mode.value === 'dark',
  )

  const naiveTheme = computed<GlobalTheme | null>(() => (isDark.value ? darkTheme : null))

  function setMode(next: ThemeMode): void {
    mode.value = next
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // ignore persistence failures
    }
    document.documentElement.classList.toggle('dark', isDark.value)
  }

  // Apply on first use.
  document.documentElement.classList.toggle('dark', isDark.value)

  return { mode, isDark, naiveTheme, setMode }
}
