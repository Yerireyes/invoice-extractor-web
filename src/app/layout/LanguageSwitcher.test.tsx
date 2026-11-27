import { render, renderHook, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { LANGUAGE_STORAGE_KEY } from '@/i18n'
import { useFormatters } from '@/i18n/use-formatters'
import { Providers } from '../providers'
import { routes } from '../router'

function renderApp() {
  render(
    <Providers>
      <RouterProvider router={createMemoryRouter(routes)} />
    </Providers>,
  )
}

describe('LanguageSwitcher', () => {
  it('switches the interface language and remembers it', async () => {
    const user = userEvent.setup()
    renderApp()

    expect(screen.getByRole('link', { name: 'Saltar al contenido' })).toBeInTheDocument()

    await user.click(screen.getByRole('combobox', { name: 'Idioma' }))
    await user.click(await screen.findByRole('option', { name: 'English' }))

    expect(screen.getByRole('link', { name: 'Skip to content' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Language' })).toHaveTextContent('English')
    expect(document.documentElement.lang).toBe('en')
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('en')
  })

  it('is operable with the keyboard', async () => {
    const user = userEvent.setup()
    renderApp()

    await user.tab() // skip link
    await user.tab() // home link
    await user.tab() // theme switcher
    await user.tab() // language switcher
    expect(screen.getByRole('combobox', { name: 'Idioma' })).toHaveFocus()

    await user.keyboard('{Enter}')
    await user.click(await screen.findByRole('option', { name: 'English' }))
    expect(document.documentElement.lang).toBe('en')
  })
})

describe('useFormatters', () => {
  it('formats with the active language', () => {
    const { result } = renderHook(() => useFormatters())
    expect(result.current.locale.startsWith('es')).toBe(true)
    expect(result.current.date('2026-01-01', 'long')).toBe('1 de enero de 2026')
    expect(result.current.money('10.00', 'EUR').replace(/\s/g, ' ')).toMatch(/^10,00 €$/)
    expect(result.current.percent(0.5, { ratio: true }).replace(/\s/g, ' ')).toBe('50 %')
  })
})
