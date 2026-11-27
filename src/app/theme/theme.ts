import { create } from 'zustand'

// Light, dark or the system's choice. The preference lives in localStorage ('theme'); index.html
// applies it before first paint with the same rules, so there is no flash on load.

export type ThemePreference = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

export const THEME_KEY = 'theme'
export const THEME_PREFERENCES: readonly ThemePreference[] = ['light', 'dark', 'system']

const DARK_QUERY = '(prefers-color-scheme: dark)'

export const isThemePreference = (value: unknown): value is ThemePreference =>
  value === 'light' || value === 'dark' || value === 'system'

function readPreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(THEME_KEY)
    return isThemePreference(stored) ? stored : 'system'
  } catch {
    return 'system'
  }
}

function systemTheme(): ResolvedTheme {
  return typeof window !== 'undefined' && window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light'
}

export const resolveTheme = (preference: ThemePreference): ResolvedTheme =>
  preference === 'system' ? systemTheme() : preference

function apply(theme: ResolvedTheme) {
  const root = document.documentElement
  root.classList.toggle('dark', theme === 'dark')
  root.style.colorScheme = theme
}

interface ThemeState {
  preference: ThemePreference
  resolved: ResolvedTheme
  setPreference: (preference: ThemePreference) => void
  /** Re-reads the system theme (it changed while the preference is 'system'). */
  syncSystem: () => void
}

export const useThemeStore = create<ThemeState>()((set, get) => {
  const preference = readPreference()
  return {
    preference,
    resolved: resolveTheme(preference),
    setPreference: (next) => {
      try {
        if (next === 'system') localStorage.removeItem(THEME_KEY)
        else localStorage.setItem(THEME_KEY, next)
      } catch {
        // Private mode or blocked storage: the choice still applies for this visit.
      }
      const resolved = resolveTheme(next)
      apply(resolved)
      set({ preference: next, resolved })
    },
    syncSystem: () => {
      if (get().preference !== 'system') return
      const resolved = systemTheme()
      apply(resolved)
      set({ resolved })
    },
  }
})

/** Keeps the 'system' preference in step with the OS while the app runs. */
export function watchSystemTheme(): () => void {
  const media = window.matchMedia(DARK_QUERY)
  const onChange = () => {
    useThemeStore.getState().syncSystem()
  }
  media.addEventListener('change', onChange)
  return () => {
    media.removeEventListener('change', onChange)
  }
}
