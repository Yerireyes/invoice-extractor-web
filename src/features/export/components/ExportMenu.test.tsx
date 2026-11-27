import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { createMemoryRouter, RouterProvider } from 'react-router'
import type { MockInstance } from 'vitest'
import { Providers } from '@/app/providers'
import { routes } from '@/app/router'
import type { ExportRequest, Invoice, Issue } from '@/lib/api-models'
import { invoiceEur, invoiceMxn } from '@/mocks/fixtures/invoices'
import { server } from '@/mocks/node'
import { useInvoicesStore, type BatchInvoice } from '@/store/invoices'

const totalMismatch: Issue = {
  code: 'TOTAL_MISMATCH',
  severity: 'error',
  field: 'total',
  params: { expected: '1160.00', actual: '1150.00' },
}

function entry(id: string, invoice: Invoice, issues: Issue[] = []): BatchInvoice {
  return {
    id,
    fileName: `${id}.png`,
    file: new File(['x'], `${id}.png`, { type: 'image/png' }),
    previewUrl: `blob:${id}`,
    invoice,
    validation: { status: issues.length > 0 ? 'invalid' : 'valid', issues },
    fieldConfidence: {},
    meta: null,
    confirmedFields: [],
  }
}

function renderReview() {
  const router = createMemoryRouter(routes, { initialEntries: ['/review'] })
  render(
    <Providers>
      <RouterProvider router={router} />
    </Providers>,
  )
  return userEvent.setup()
}

/** Records export requests and answers like the API. */
function captureExports() {
  const requests: { format: string; body: ExportRequest }[] = []
  server.use(
    http.post('*/api/v1/exports/:format', async ({ request, params }) => {
      requests.push({
        format: String(params.format),
        body: (await request.json()) as ExportRequest,
      })
      return new HttpResponse('file', {
        headers: { 'Content-Disposition': 'attachment; filename="facturas_20261127_1830.xlsx"' },
      })
    }),
  )
  return requests
}

const openPanel = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('button', { name: 'Exportar' }))
  return screen.getByRole('dialog', { name: 'Exportar facturas' })
}

describe('ExportMenu', () => {
  let click: MockInstance<HTMLAnchorElement['click']>

  beforeEach(() => {
    click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
  })

  afterEach(() => {
    click.mockRestore()
    useInvoicesStore.getState().clear()
  })

  it('exports the whole batch to Excel with the original file names', async () => {
    useInvoicesStore.getState().add([entry('mx', invoiceMxn), entry('es', invoiceEur)])
    const requests = captureExports()
    const user = renderReview()

    const panel = await openPanel(user)
    expect(within(panel).getByRole('radio', { name: /Excel/ })).toBeChecked()
    expect(within(panel).getByRole('radio', { name: 'Todo el lote (2 facturas)' })).toBeChecked()
    await user.click(within(panel).getByRole('button', { name: 'Exportar 2 facturas' }))

    expect(await screen.findByText('Descargado: facturas_20261127_1830.xlsx')).toBeInTheDocument()
    expect(requests).toHaveLength(1)
    const [request] = requests
    expect(request?.format).toBe('excel')
    expect(request?.body.options).toEqual({
      language: 'es',
      include_line_items: true,
      include_alerts: true,
    })
    expect(request?.body.invoices.map((invoice) => invoice.source_file_name)).toEqual([
      'mx.png',
      'es.png',
    ])
    expect(request?.body.invoices[0]).not.toHaveProperty('validation')
    const link = click.mock.contexts[0] as HTMLAnchorElement
    expect(link.download).toBe('facturas_20261127_1830.xlsx')
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  it('exports chosen invoices to PDF with the chosen options', async () => {
    useInvoicesStore.getState().add([entry('mx', invoiceMxn), entry('es', invoiceEur)])
    const requests = captureExports()
    const user = renderReview()

    const panel = await openPanel(user)
    await user.click(within(panel).getByRole('radio', { name: /PDF/ }))
    await user.selectOptions(within(panel).getByLabelText('Idioma del archivo'), 'en')
    await user.click(within(panel).getByRole('checkbox', { name: 'Alertas de validación' }))
    await user.click(within(panel).getByRole('radio', { name: 'Elegir facturas' }))
    await user.click(within(panel).getByRole('checkbox', { name: /Comercial Ficticia/ }))
    await user.click(within(panel).getByRole('button', { name: 'Exportar 1 factura' }))

    await waitFor(() => {
      expect(requests).toHaveLength(1)
    })
    expect(requests[0]?.format).toBe('pdf')
    expect(requests[0]?.body.options).toEqual({
      language: 'en',
      include_line_items: true,
      include_alerts: false,
    })
    expect(requests[0]?.body.invoices.map((invoice) => invoice.source_file_name)).toEqual([
      'es.png',
    ])
  })

  it('asks to export anyway when a chosen invoice has errors', async () => {
    useInvoicesStore
      .getState()
      .add([entry('mx', invoiceMxn, [totalMismatch]), entry('es', invoiceEur)])
    const user = renderReview()

    const panel = await openPanel(user)
    expect(
      within(panel).getByText('1 factura tiene errores sin corregir. Se exportará tal como está.'),
    ).toBeInTheDocument()
    expect(within(panel).getByRole('button', { name: 'Exportar de todos modos' })).toBeEnabled()

    await user.click(within(panel).getByRole('radio', { name: 'Elegir facturas' }))
    await user.click(within(panel).getByRole('checkbox', { name: /Comercial Ficticia/ }))
    expect(within(panel).queryByText(/errores sin corregir/)).not.toBeInTheDocument()
    expect(within(panel).getByRole('button', { name: 'Exportar 1 factura' })).toBeEnabled()

    await user.click(within(panel).getByRole('checkbox', { name: /Estudio Ejemplo/ }))
    expect(within(panel).getByText('Elige al menos una factura.')).toBeInTheDocument()
    expect(within(panel).getByRole('button', { name: 'Exportar 0 facturas' })).toBeDisabled()
  })

  it('explains why the export failed', async () => {
    useInvoicesStore.getState().add([entry('mx', invoiceMxn)])
    server.use(
      http.post('*/api/v1/exports/excel', () =>
        HttpResponse.json(
          { code: 'TOO_MANY_INVOICES', params: { max_invoices: 100 }, status: 422 },
          { status: 422, headers: { 'Content-Type': 'application/problem+json' } },
        ),
      ),
    )
    const user = renderReview()

    const panel = await openPanel(user)
    await user.click(within(panel).getByRole('button', { name: 'Exportar 1 factura' }))

    expect(await screen.findByText(/como máximo 100 facturas a la vez/)).toBeInTheDocument()
    expect(click).not.toHaveBeenCalled()
  })

  it('is not offered when the batch is empty', () => {
    renderReview()
    expect(screen.queryByRole('button', { name: 'Exportar' })).not.toBeInTheDocument()
  })
})
