import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { Providers } from '@/app/providers'
import { routes } from '@/app/router'
import { meta } from '@/mocks/fixtures/meta'
import { server } from '@/mocks/node'
import { useInvoicesStore } from '@/store/invoices'
import { useSelectionStore } from '../selection-store'

function renderUpload() {
  const router = createMemoryRouter(routes, { initialEntries: ['/'] })
  render(
    <Providers>
      <RouterProvider router={router} />
    </Providers>,
  )
  return { router, user: userEvent.setup({ applyAccept: false }) }
}

const png = (name: string) => new File([`png ${name}`], name, { type: 'image/png' })
const input = () => {
  const element = document.querySelector<HTMLInputElement>('input[type=file]')
  if (!element) throw new Error('file input not found')
  return element
}
const fileList = () => screen.getByRole('list', { name: 'Archivos seleccionados' })

describe('Upload → extract', () => {
  afterEach(() => {
    useSelectionStore.getState().clear()
    useInvoicesStore.getState().clear()
  })

  it('extracts every file, stores the batch and goes to /review', async () => {
    const { router, user } = renderUpload()
    await user.upload(input(), [png('factura-1.png'), png('factura-2.png')])

    await user.click(screen.getByRole('button', { name: 'Extraer datos (2)' }))

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/review')
    })

    const batch = useInvoicesStore.getState().invoices
    expect(batch.map((invoice) => invoice.fileName)).toEqual(['factura-1.png', 'factura-2.png'])
    expect(batch[0]?.invoice.currency).toBe('MXN')
    expect(batch[0]?.validation.status).toBe('invalid')
    expect(batch[0]?.previewUrl).toMatch(/^blob:/)
    expect(useSelectionStore.getState().items).toEqual([])
  })

  it('shows an accessible progress state while the request runs', async () => {
    let release: () => void = () => undefined
    const held = new Promise<void>((resolve) => {
      release = resolve
    })
    server.use(
      http.post('*/api/v1/invoices/extract', async () => {
        await held
        return HttpResponse.json({ results: [], summary: { total: 0, succeeded: 0, failed: 0 } })
      }),
    )
    const { user } = renderUpload()
    await user.upload(input(), [png('factura.png')])
    await user.click(screen.getByRole('button', { name: 'Extraer datos (1)' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Enviando tus facturas…')
    expect(
      screen.getByRole('progressbar', { name: 'Progreso de la extracción' }),
    ).toBeInTheDocument()
    expect(within(fileList()).getAllByText('Leyendo…').length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: 'Quitar factura.png' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Extraer datos (1)' })).toBeDisabled()

    release()
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    })
  })

  it('keeps failed files with their reason and lets the user retry them', async () => {
    const { router, user } = renderUpload()
    await user.upload(input(), [png('factura.png'), png('foto_perro.png')])

    await user.click(screen.getByRole('button', { name: 'Extraer datos (2)' }))

    const failedRow = (await within(fileList()).findByText('foto_perro.png')).closest('li')
    expect(failedRow).not.toBeNull()
    await waitFor(() => {
      expect(failedRow).toHaveAccessibleDescription('No parece una factura ni un recibo.')
    })
    expect(within(fileList()).queryByText('factura.png')).not.toBeInTheDocument()
    expect(screen.getByText('1 factura leída, lista para revisar.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Revisar 1 factura' })).toHaveAttribute(
      'href',
      '/review',
    )
    expect(
      screen.getByText(
        'Se leyeron 1 de 2. Revisa los archivos que fallaron: puedes quitarlos o volver a intentarlo.',
      ),
    ).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/')

    // The retry succeeds this time
    server.use(
      http.post('*/api/v1/invoices/extract', () =>
        HttpResponse.json({
          results: [
            {
              file_name: 'foto_perro.png',
              status: 'success',
              invoice: { document_type: 'receipt', currency: 'EUR', total: '3.00', line_items: [] },
              validation: { status: 'valid' },
            },
          ],
          summary: { total: 1, succeeded: 1, failed: 0 },
        }),
      ),
    )
    await user.click(screen.getByRole('button', { name: 'Volver a intentar (1)' }))

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/review')
    })
    expect(useInvoicesStore.getState().invoices.map((invoice) => invoice.fileName)).toEqual([
      'factura.png',
      'foto_perro.png',
    ])
  })

  it('explains a 429 and blocks the retry until the wait is over', async () => {
    server.use(
      http.post('*/api/v1/invoices/extract', () =>
        HttpResponse.json(
          {
            title: 'Too Many Requests',
            status: 429,
            code: 'RATE_LIMITED',
            params: { retry_after_s: 1 },
          },
          { status: 429, headers: { 'Content-Type': 'application/problem+json' } },
        ),
      ),
    )
    const { user } = renderUpload()
    await user.upload(input(), [png('factura.png')])
    await user.click(screen.getByRole('button', { name: 'Extraer datos (1)' }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(
      'Has hecho demasiadas peticiones. Espera 1 segundo y vuelve a intentarlo.',
    )
    expect(alert).toHaveTextContent('Podrás volver a intentarlo en 1 segundo.')
    expect(screen.getByRole('button', { name: 'Extraer datos (1)' })).toBeDisabled()

    expect(
      await screen.findByText('Ya puedes volver a intentarlo.', {}, { timeout: 2500 }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Extraer datos (1)' })).toBeEnabled()
    expect(within(fileList()).getByText('factura.png')).toBeInTheDocument()
  })

  it.each([
    [
      'quota.png',
      'Se alcanzó el límite diario del servicio de demostración. Vuelve a intentarlo mañana.',
    ],
    ['offline.png', 'El servicio de IA no responde. Vuelve a intentarlo en unos minutos.'],
  ])('explains a 503 for %s and keeps the files to retry', async (name, message) => {
    const { user } = renderUpload()
    await user.upload(input(), [png(name)])
    await user.click(screen.getByRole('button', { name: 'Extraer datos (1)' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(message)
    expect(screen.getByRole('button', { name: 'Extraer datos (1)' })).toBeEnabled()
  })

  it('explains network errors', async () => {
    server.use(http.post('*/api/v1/invoices/extract', () => HttpResponse.error()))
    const { user } = renderUpload()
    await user.upload(input(), [png('factura.png')])
    await user.click(screen.getByRole('button', { name: 'Extraer datos (1)' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No hay conexión con el servidor. Comprueba tu conexión a internet.',
    )
  })

  it('warns that results are sample data when the backend runs the fake provider', async () => {
    server.use(
      http.get('*/api/v1/meta', () =>
        HttpResponse.json({
          ...meta,
          providers: [
            { id: 'fake', available: true, default: true },
            { id: 'gemini', available: false, default: false },
          ],
        }),
      ),
    )
    const { user } = renderUpload()
    await user.upload(input(), [png('factura.png')])

    expect(
      await screen.findByText(
        'Modo demo: el servidor devuelve facturas de ejemplo, no lee tus archivos de verdad.',
      ),
    ).toBeInTheDocument()
  })

  it('only sends the files without client-side problems', async () => {
    let sent: string[] = []
    server.use(
      http.post('*/api/v1/invoices/extract', async ({ request }) => {
        const data = await request.formData()
        sent = data.getAll('files').map((entry) => (typeof entry === 'string' ? entry : entry.name))
        return HttpResponse.json({ results: [], summary: { total: 0, succeeded: 0, failed: 0 } })
      }),
    )
    const { user } = renderUpload()
    await user.upload(input(), [
      png('factura.png'),
      new File(['GIF89a'], 'gato.gif', { type: 'image/gif' }),
    ])

    await user.click(screen.getByRole('button', { name: 'Extraer datos (1)' }))

    await waitFor(() => {
      expect(sent).toEqual(['factura.png'])
    })
  })
})
