import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { App } from './App'
import { Providers } from './providers'
import { routes } from './router'

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(
    <Providers>
      <RouterProvider router={router} />
    </Providers>,
  )
  return router
}

describe('App', () => {
  it('renders the shell with the main landmark', () => {
    render(<App />)
    expect(screen.getByText('Invoice Extractor')).toBeInTheDocument()
    expect(screen.getByRole('main')).toBeInTheDocument()
  })

  it.each(['/', '/review'])('serves the %s route inside the layout', (path) => {
    const router = renderAt(path)
    expect(router.state.location.pathname).toBe(path)
    expect(router.state.matches.at(-1)?.route.path ?? '/').toBe(path === '/' ? '/' : 'review')
    expect(screen.getByRole('main')).toBeInTheDocument()
  })
})
