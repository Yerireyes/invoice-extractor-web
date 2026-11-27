import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { Providers } from '@/app/providers'
import { routes } from '@/app/router'
import type { Invoice, Issue, ValidationStatus } from '@/lib/api-models'
import { invoiceEur, invoiceMxn, receiptUsd } from '@/mocks/fixtures/invoices'
import { server } from '@/mocks/node'
import { useInvoicesStore, type BatchInvoice } from '@/store/invoices'

/** An issue that explains each status, as the API would send it. */
const ISSUES_FOR: Record<ValidationStatus, Issue[]> = {
  valid: [],
  warnings: [{ code: 'FUTURE_DATE', severity: 'warning', field: 'issue_date', params: {} }],
  invalid: [
    {
      code: 'TOTAL_MISMATCH',
      severity: 'error',
      field: 'total',
      params: { expected: '1160.00', actual: '1150.00' },
    },
  ],
}

function entry(
  id: string,
  invoice: Invoice,
  status: ValidationStatus,
  overrides: Partial<BatchInvoice> = {},
): BatchInvoice {
  const isPdf = id.endsWith('pdf')
  return {
    id,
    fileName: `${id}.${isPdf ? 'pdf' : 'png'}`,
    file: new File(['x'], `${id}.${isPdf ? 'pdf' : 'png'}`, {
      type: isPdf ? 'application/pdf' : 'image/png',
    }),
    previewUrl: `blob:${id}`,
    invoice,
    validation: { status, issues: ISSUES_FOR[status] },
    fieldConfidence: {},
    meta: null,
    confirmedFields: [],
    ...overrides,
  }
}

function seed() {
  useInvoicesStore.getState().add([
    entry('mx', invoiceMxn, 'invalid', {
      fieldConfidence: { 'issuer.tax_id': 0.62, total: 0.98 },
    }),
    entry('es-pdf', invoiceEur, 'valid'),
    entry('us', receiptUsd, 'warnings', { fieldConfidence: { invoice_number: 0.66 } }),
  ])
}

function setDesktop(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string) =>
      ({
        matches,
        media: query,
        onchange: null,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        dispatchEvent: () => false,
      }) as unknown as MediaQueryList,
  })
}

function renderReview(path = '/review') {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(
    <Providers>
      <RouterProvider router={router} />
    </Providers>,
  )
  return { router, user: userEvent.setup() }
}

function present<T>(value: T | undefined): T {
  if (value === undefined) throw new Error('expected element is missing')
  return value
}

const panelHeading = () =>
  screen.getByRole('heading', { level: 2, name: /Comercial|Estudio|Sample/ })

describe('ReviewPage', () => {
  afterEach(() => {
    useInvoicesStore.getState().clear()
    setDesktop(false)
  })

  it('invites to upload when the batch is empty', () => {
    renderReview()
    const main = screen.getByRole('main')
    expect(
      within(main).getByRole('heading', { name: 'Todavía no hay facturas para revisar' }),
    ).toBeInTheDocument()
    expect(within(main).getByRole('link', { name: 'Subir facturas' })).toHaveAttribute('href', '/')
  })

  describe('desktop', () => {
    beforeEach(() => {
      setDesktop(true)
      seed()
    })

    it('lists the batch with each status and a summary', () => {
      renderReview()
      const batch = screen.getByRole('list', { name: 'Facturas del lote' })
      const items = within(batch).getAllByRole('button')

      expect(items).toHaveLength(3)
      expect(items[0]).toHaveAttribute('aria-current', 'true')
      expect(within(present(items[0])).getByText('Con errores')).toBeInTheDocument()
      expect(within(present(items[1])).getByText('Válida')).toBeInTheDocument()
      expect(within(present(items[2])).getByText('Con advertencias')).toBeInTheDocument()
      expect(screen.getByText('1 válida')).toBeInTheDocument()
      expect(screen.getByText('1 con advertencias')).toBeInTheDocument()
      expect(screen.getByText('1 con errores')).toBeInTheDocument()
      expect(screen.getByRole('navigation', { name: 'Ruta' })).toHaveTextContent('3 facturas')
    })

    it('shows the original next to the form and moves through the batch', async () => {
      const { router, user } = renderReview()

      expect(panelHeading()).toHaveTextContent('Comercial Ficticia del Norte S.A. de C.V.')
      expect(screen.getByRole('img', { name: 'Imagen original de mx.png' })).toHaveAttribute(
        'src',
        'blob:mx',
      )
      expect(screen.getByText('1 de 3')).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Factura siguiente' }))
      expect(panelHeading()).toHaveTextContent('Estudio Ejemplo Diseño S.L.')
      expect(router.state.location.search).toBe('?id=es-pdf')
      expect(screen.getByTitle('PDF original de es-pdf.pdf')).toHaveAttribute('data', 'blob:es-pdf')

      await user.click(screen.getByRole('button', { name: /Sample Hardware Co\./ }))
      expect(panelHeading()).toHaveTextContent('Sample Hardware Co.')
      expect(screen.getByRole('button', { name: 'Factura siguiente' })).toBeDisabled()
      expect(screen.queryByRole('button', { name: 'Siguiente factura' })).not.toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Factura anterior' }))
      expect(panelHeading()).toHaveTextContent('Estudio Ejemplo Diseño S.L.')
    })

    it('opens the invoice named in the URL', () => {
      renderReview('/review?id=us')
      expect(panelHeading()).toHaveTextContent('Sample Hardware Co.')
    })

    it('zooms the original image', async () => {
      const { user } = renderReview()
      const image = screen.getByRole('img', { name: 'Imagen original de mx.png' })
      expect(image).toHaveStyle({ width: '100%' })

      await user.click(screen.getByRole('button', { name: 'Acercar' }))
      await user.click(screen.getByRole('button', { name: 'Acercar' }))
      expect(image).toHaveStyle({ width: '150%' })
      expect(screen.getByText('150 %')).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Ajustar' }))
      expect(image).toHaveStyle({ width: '100%' })
      await user.click(screen.getByRole('button', { name: 'Alejar' }))
      await user.click(screen.getByRole('button', { name: 'Alejar' }))
      expect(screen.getByRole('button', { name: 'Alejar' })).toBeDisabled()
    })

    it('fills the form with the extracted data', () => {
      renderReview()
      expect(screen.getByLabelText('Tipo de documento')).toHaveValue('invoice')
      expect(screen.getByLabelText('Número de factura')).toHaveValue('A-00123')
      expect(screen.getByLabelText('Fecha de emisión')).toHaveValue('2026-11-20')
      expect(screen.getByLabelText('Moneda')).toHaveValue('MXN')
      expect(screen.getByLabelText('País')).toHaveValue('MX')
      const issuer = screen.getByRole('group', { name: 'Emisor' })
      expect(within(issuer).getByLabelText('Nombre')).toHaveValue(
        'Comercial Ficticia del Norte S.A. de C.V.',
      )
      expect(within(issuer).getByLabelText(/ID fiscal · RFC/)).toHaveValue('CFN010101AB1')
      expect(screen.getByLabelText('Método de pago')).toHaveValue('Transferencia')
    })

    it('saves edits to the batch and explains invalid values', async () => {
      const { user } = renderReview()

      const number = screen.getByLabelText('Número de factura')
      await user.clear(number)
      await user.type(number, 'A-00999')
      expect(useInvoicesStore.getState().invoices[0]?.invoice.invoice_number).toBe('A-00999')

      const name = within(screen.getByRole('group', { name: 'Emisor' })).getByLabelText('Nombre')
      await user.clear(name)
      expect(name).toBeInvalid()
      expect(name).toHaveAccessibleDescription('Este dato es obligatorio.')
      expect(useInvoicesStore.getState().invoices[0]?.invoice.issuer.name).toBeNull()

      await user.selectOptions(screen.getByLabelText('Moneda'), 'USD')
      expect(useInvoicesStore.getState().invoices[0]?.invoice.currency).toBe('USD')
    })

    it('highlights low-confidence fields until the user checks them', async () => {
      const { user } = renderReview()
      const taxId = within(screen.getByRole('group', { name: 'Emisor' })).getByLabelText(
        /ID fiscal · RFC/,
      )
      expect(taxId).toHaveAccessibleDescription(
        /^La IA no está segura de este dato \(62\s%\sde confianza\)\. Compáralo con la imagen original\.$/,
      )

      await user.click(screen.getByRole('button', { name: 'Marcar «ID fiscal» como correcto' }))
      expect(taxId).not.toHaveAccessibleDescription()
      expect(useInvoicesStore.getState().invoices[0]?.confirmedFields).toEqual(['issuer.tax_id'])
    })

    it('counts editing a doubtful field as checking it', async () => {
      const { user } = renderReview('/review?id=us')
      const number = screen.getByLabelText('Número de factura')
      expect(number).toHaveAccessibleDescription(/66\s%\sde confianza/)

      await user.type(number, '-B')
      expect(number).not.toHaveAccessibleDescription()
      expect(useInvoicesStore.getState().invoices[2]?.confirmedFields).toEqual(['invoice_number'])
    })
  })

  describe('mobile', () => {
    beforeEach(() => {
      seed()
    })

    it('switches between the data and the image with tabs', async () => {
      const { user } = renderReview()

      expect(screen.getByRole('tab', { name: 'Datos' })).toHaveAttribute('aria-selected', 'true')
      // The picker already navigates; the panel does not repeat it on mobile
      expect(screen.queryByText('1 de 3')).not.toBeInTheDocument()
      expect(screen.getAllByRole('button', { name: 'Factura siguiente' })).toHaveLength(1)
      expect(screen.getByLabelText('Número de factura')).toBeInTheDocument()
      expect(screen.queryByRole('img', { name: /Imagen original/ })).not.toBeInTheDocument()

      await user.click(screen.getByRole('tab', { name: 'Imagen' }))
      expect(screen.getByRole('img', { name: 'Imagen original de mx.png' })).toBeInTheDocument()
    })

    it('picks the invoice from a list', async () => {
      const { user } = renderReview()

      await user.selectOptions(screen.getByLabelText('Factura a revisar'), 'us')
      expect(panelHeading()).toHaveTextContent('Sample Hardware Co.')

      await user.click(present(screen.getAllByRole('button', { name: 'Factura anterior' })[0]))
      expect(panelHeading()).toHaveTextContent('Estudio Ejemplo Diseño S.L.')
    })
  })

  describe('line items, taxes and totals', () => {
    const stored = () => present(useInvoicesStore.getState().invoices[0]).invoice
    const plain = (text: string) => text.replace(/\s/g, ' ')

    beforeEach(() => {
      useInvoicesStore
        .getState()
        .add([
          entry('mx', invoiceMxn, 'invalid', { fieldConfidence: { 'line_items.0.amount': 0.55 } }),
        ])
    })

    it('shows the lines, taxes and totals with the currency format', () => {
      renderReview()

      expect(screen.getByLabelText('Descripción (concepto 1)')).toHaveValue(
        'Servicio de consultoría',
      )
      expect(screen.getByLabelText('Cantidad (concepto 1)')).toHaveValue('2')
      expect(screen.getByLabelText('Precio unitario (concepto 1)')).toHaveValue('500,00')
      expect(screen.getByLabelText('% de impuesto (concepto 1)')).toHaveValue('16')
      expect(screen.getByLabelText('Impuesto (impuesto 1)')).toHaveValue('IVA')
      expect(screen.getByLabelText('Base (impuesto 1)')).toHaveValue('1000,00')
      expect(screen.getByLabelText('Subtotal')).toHaveValue('1000,00')
      expect(screen.getByLabelText('Total')).toHaveValue('1150,00')
      expect(screen.getByText('1 línea')).toBeInTheDocument()
    })

    it('reads amounts typed with either separator and keeps the API format in the store', async () => {
      const { user } = renderReview()
      const total = screen.getByLabelText('Total')

      await user.clear(total)
      await user.type(total, '1.160,5')
      expect(stored().total).toBe('1160.5')
      await user.tab()
      expect(plain((total as HTMLInputElement).value)).toBe('1160,50')

      await user.clear(total)
      await user.type(total, '1,160.00')
      expect(stored().total).toBe('1160.00')
    })

    it('flags text that is not a number and keeps the last valid amount', async () => {
      const { user } = renderReview()
      const subtotal = screen.getByLabelText('Subtotal')

      await user.type(subtotal, ' mil')

      expect(subtotal).toHaveAttribute('aria-invalid', 'true')
      expect(subtotal).toHaveAccessibleDescription('Escribe un número, por ejemplo 1234,50.')
      expect(stored().subtotal).toBe('1000.00')
    })

    it('adds and removes line items and taxes', async () => {
      const { user } = renderReview()

      await user.click(screen.getByRole('button', { name: 'Agregar concepto' }))
      expect(screen.getByLabelText('Descripción (concepto 2)')).toHaveFocus()
      await user.keyboard('Envío')
      expect(stored().line_items).toHaveLength(2)
      expect(stored().line_items[1]?.description).toBe('Envío')
      expect(screen.getByText('2 líneas')).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Eliminar el concepto 1' }))
      expect(stored().line_items.map((line) => line.description)).toEqual(['Envío'])
      expect(screen.getByLabelText('Descripción (concepto 1)')).toHaveValue('Envío')

      await user.click(screen.getByRole('button', { name: 'Eliminar el impuesto 1' }))
      expect(stored().taxes).toEqual([])
      expect(screen.getByText('Esta factura no tiene impuestos.')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Agregar impuesto' })).toHaveFocus()

      await user.click(screen.getByRole('button', { name: 'Agregar impuesto' }))
      expect(screen.getByLabelText('Impuesto (impuesto 1)')).toHaveFocus()
      expect(stored().taxes).toHaveLength(1)
    })

    it('explains a doubtful cell and lets the user confirm it', async () => {
      const { user } = renderReview()
      const amount = screen.getByLabelText('Importe (concepto 1)')

      expect(amount).toHaveAccessibleDescription(
        /Importe: La IA no está segura de este dato \(55\s%/,
      )
      await user.click(
        screen.getByRole('button', { name: 'Marcar «Importe (concepto 1)» como correcto' }),
      )

      expect(amount).not.toHaveAccessibleDescription()
      expect(amount).toHaveFocus()
      expect(present(useInvoicesStore.getState().invoices[0]).confirmedFields).toEqual([
        'line_items.0.amount',
      ])
    })

    it('forgets the doubt of a removed line instead of moving it to the next one', async () => {
      const { user } = renderReview()
      await user.click(screen.getByRole('button', { name: 'Agregar concepto' }))
      await user.click(screen.getByRole('button', { name: 'Eliminar el concepto 1' }))

      expect(screen.queryByRole('button', { name: /como correcto/ })).not.toBeInTheDocument()
      expect(present(useInvoicesStore.getState().invoices[0]).fieldConfidence).toEqual({})
    })
  })

  describe('live validation', () => {
    const issuesPanel = () => screen.getByRole('region', { name: 'Por revisar' })

    beforeEach(() => {
      setDesktop(true)
      useInvoicesStore
        .getState()
        .add([
          entry('mx', invoiceMxn, 'invalid', { fieldConfidence: { 'issuer.tax_id': 0.62 } }),
          entry('es-pdf', invoiceEur, 'valid'),
        ])
    })

    it('lists issues and doubts, errors first, and jumps to the field', async () => {
      const { user } = renderReview()
      const items = within(issuesPanel()).getAllByRole('listitem')

      expect(items).toHaveLength(2)
      expect(items[0]).toHaveTextContent(/Error: El total no cuadra.*1\s?160,00/)
      expect(items[0]).toHaveTextContent('Total')
      expect(items[1]).toHaveTextContent(/La IA no está segura de este dato \(62\s%/)
      expect(within(issuesPanel()).getByText('1 error')).toBeInTheDocument()
      expect(within(issuesPanel()).getByText('1 aviso')).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Ir al campo «Total»' }))
      expect(screen.getByLabelText('Total')).toHaveFocus()

      await user.click(screen.getByRole('button', { name: 'Ir al campo «ID fiscal del emisor»' }))
      expect(document.activeElement).toHaveAttribute('name', 'issuer.tax_id')
    })

    it('revalidates after editing and updates the panel and the batch list', async () => {
      const requests: unknown[] = []
      server.events.on('request:start', ({ request }) => {
        if (request.url.endsWith('/invoices/validate')) requests.push(request)
      })
      const { user } = renderReview()
      const batch = screen.getByRole('list', { name: 'Facturas del lote' })
      expect(within(batch).getAllByText('Con errores')).toHaveLength(1)

      const total = screen.getByLabelText('Total')
      await user.clear(total)
      await user.type(total, '1160')
      // Typing is debounced: nothing is sent while the numbers are still changing.
      expect(requests).toHaveLength(0)

      await waitFor(() => {
        expect(within(issuesPanel()).queryByText(/El total no cuadra/)).not.toBeInTheDocument()
      })
      expect(requests).toHaveLength(1)
      expect(within(batch).queryByText('Con errores')).not.toBeInTheDocument()
      // The AI's doubt is still there until the user checks it.
      expect(within(batch).getByText('Con advertencias')).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: /Marcar «ID fiscal.*» como correcto/ }))
      expect(within(issuesPanel()).getByText(/no queda nada por revisar/)).toBeInTheDocument()
      expect(within(batch).getAllByText('Válida')).toHaveLength(2)
      server.events.removeAllListeners()
    })

    it('keeps only the answer about the latest numbers', async () => {
      let calls = 0
      server.use(
        http.post('*/api/v1/invoices/validate', async ({ request }) => {
          calls += 1
          const first = calls === 1
          const body = (await request.json()) as { invoice: Invoice }
          // The first answer arrives late and says the (old) total is wrong.
          if (first) await new Promise((resolve) => setTimeout(resolve, 300))
          return HttpResponse.json({
            validation: first
              ? { status: 'invalid', issues: ISSUES_FOR.invalid }
              : { status: 'valid', issues: [] },
            total: body.invoice.total,
          })
        }),
      )
      const { user } = renderReview()
      const total = screen.getByLabelText('Total')

      await user.clear(total)
      await user.type(total, '1')
      await waitFor(() => {
        expect(calls).toBe(1)
      })
      await user.type(total, '160')

      await waitFor(() => {
        expect(calls).toBe(2)
      })
      await waitFor(() => {
        expect(present(useInvoicesStore.getState().invoices[0]).validation.status).toBe('valid')
      })
      await new Promise((resolve) => setTimeout(resolve, 400))
      expect(present(useInvoicesStore.getState().invoices[0]).validation.status).toBe('valid')
    })

    it('tells the user when the numbers could not be checked', async () => {
      server.use(http.post('*/api/v1/invoices/validate', () => HttpResponse.error()))
      const { user } = renderReview()

      await user.type(screen.getByLabelText('Total'), '0')

      expect(
        await screen.findByText(/No se pudo conectar|conexión/, {}, { timeout: 2000 }),
      ).toBeInTheDocument()
    })
  })
})
