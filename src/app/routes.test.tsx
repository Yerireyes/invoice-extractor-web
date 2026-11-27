import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { Providers } from './providers'
import { routes } from './router'

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(
    <Providers>
      <RouterProvider router={router} />
    </Providers>,
  )
  return { router, user: userEvent.setup() }
}

describe('routes', () => {
  it('shows a 404 page for unknown paths and leads back to the start', async () => {
    const { router, user } = renderAt('/facturas/antiguas')

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Esta página no existe' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/No hay nada en «\/facturas\/antiguas»/)).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: 'Volver a subir facturas' }))
    expect(router.state.location.pathname).toBe('/')
  })

  it('has a footer with the privacy promise, the source code and the version', async () => {
    renderAt('/')

    const footer = await screen.findByRole('contentinfo')
    expect(footer).toHaveTextContent('No almacenamos tus facturas')
    const source = screen.getByRole('link', { name: /Código en GitHub/ })
    expect(source).toHaveAttribute('href', 'https://github.com/Yerireyes/invoice-extractor-web')
    expect(source).toHaveAttribute('target', '_blank')
    expect(footer).toHaveTextContent(/v\d+\.\d+\.\d+/)
  })

  it('leaves the footer out of the full-height review workspace', async () => {
    renderAt('/review')

    await screen.findByRole('heading', { level: 1 })
    expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument()
  })
})
