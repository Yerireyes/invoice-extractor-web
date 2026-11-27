import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@/i18n'
import { THEME_KEY, useThemeStore } from './theme'
import { ThemeSwitcher } from './ThemeSwitcher'

function setSystemDark(dark: boolean) {
  const listeners = new Set<() => void>()
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string) =>
      ({
        matches: dark,
        media: query,
        addEventListener: (_: string, listener: () => void) => listeners.add(listener),
        removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
      }) as unknown as MediaQueryList,
  })
  return () => {
    listeners.forEach((listener) => {
      listener()
    })
  }
}

const isDark = () => document.documentElement.classList.contains('dark')

describe('theme', () => {
  afterEach(() => {
    useThemeStore.getState().setPreference('system')
    localStorage.clear()
  })

  it('saves an explicit choice and applies it to the document', () => {
    setSystemDark(false)
    useThemeStore.getState().setPreference('dark')
    expect(localStorage.getItem(THEME_KEY)).toBe('dark')
    expect(isDark()).toBe(true)
    expect(document.documentElement.style.colorScheme).toBe('dark')

    useThemeStore.getState().setPreference('system')
    expect(localStorage.getItem(THEME_KEY)).toBeNull()
    expect(isDark()).toBe(false)
  })

  it('follows the system only while the preference is "system"', () => {
    const notify = setSystemDark(true)
    useThemeStore.getState().syncSystem()
    expect(isDark()).toBe(true)

    useThemeStore.getState().setPreference('light')
    notify()
    expect(isDark()).toBe(false)
  })

  it('switches from the header menu', async () => {
    setSystemDark(false)
    const user = userEvent.setup()
    render(<ThemeSwitcher />)

    await user.click(screen.getByRole('button', { name: 'Tema: Sistema. Cambiar el tema' }))
    expect(screen.getByRole('menuitemradio', { name: 'Sistema' })).toBeChecked()
    await user.click(screen.getByRole('menuitemradio', { name: 'Oscuro' }))

    expect(isDark()).toBe(true)
    expect(
      screen.getByRole('button', { name: 'Tema: Oscuro. Cambiar el tema' }),
    ).toBeInTheDocument()
  })
})
