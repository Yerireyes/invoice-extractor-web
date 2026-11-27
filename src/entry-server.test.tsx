import { act } from '@testing-library/react'
import { StrictMode } from 'react'
import { hydrateRoot, type Root } from 'react-dom/client'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { Providers } from '@/app/providers'
import { routes } from '@/app/router'
import i18n from '@/i18n'
import { render } from './entry-server'

describe('prerender of the landing page', () => {
  let root: Root | undefined

  afterEach(async () => {
    act(() => {
      root?.unmount()
    })
    root = undefined
    document.body.innerHTML = ''
    await i18n.changeLanguage('es')
  })

  it.each([
    ['es', 'De la foto al Excel, sin teclear.'],
    ['en', 'From photo to Excel, no typing.'],
  ] as const)('renders "/" in %s with the page content', async (language, title) => {
    const html = await render('/', language)

    const page = new DOMParser().parseFromString(html, 'text/html')
    expect(page.querySelector('h1')?.textContent.replace(/\s+/g, ' ').trim()).toBe(title)
    expect(html).toContain('<main')
    expect(html).toContain('<footer')
  })

  it.each(['es', 'en'] as const)('hydrates the %s markup without mismatches', async (language) => {
    const container = document.createElement('div')
    container.innerHTML = await render('/', language)
    document.body.append(container)
    const before = container.innerHTML
    const recoverable = vi.fn()
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    await i18n.changeLanguage(language)
    const router = createMemoryRouter(routes, { initialEntries: ['/'] })
    await act(async () => {
      root = hydrateRoot(
        container,
        <StrictMode>
          <Providers>
            <RouterProvider router={router} />
          </Providers>
        </StrictMode>,
        { onRecoverableError: recoverable },
      )
      await Promise.resolve()
    })

    expect(recoverable).not.toHaveBeenCalled()
    const hydrationErrors = consoleError.mock.calls.filter((call) =>
      call.some((arg) => typeof arg === 'string' && /hydrat/i.test(arg)),
    )
    expect(hydrationErrors).toEqual([])
    // The page React took over is the one the browser painted (same first element).
    expect(container.firstElementChild?.outerHTML.slice(0, 200)).toBe(
      new DOMParser()
        .parseFromString(before, 'text/html')
        .body.firstElementChild?.outerHTML.slice(0, 200),
    )
    consoleError.mockRestore()
  })
})
