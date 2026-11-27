import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { Providers } from '@/app/providers'
import { routes } from '@/app/router'
import type { Invoice, ValidationStatus } from '@/lib/api-models'
import { invoiceEur, invoiceMxn, receiptUsd } from '@/mocks/fixtures/invoices'
import { useInvoicesStore, type BatchInvoice } from '@/store/invoices'

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
    validation: { status, issues: [] },
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
})
