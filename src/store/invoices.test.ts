import { normalizeInvoice } from '@/lib/api-models'
import { needsCheck, useInvoicesStore, type BatchInvoice } from './invoices'

const entry = (id: string, previewUrl: string | null = `blob:${id}`): BatchInvoice => ({
  id,
  fileName: `${id}.png`,
  file: new File(['x'], `${id}.png`, { type: 'image/png' }),
  previewUrl,
  invoice: normalizeInvoice({ document_type: 'invoice', line_items: [] }),
  validation: { status: 'valid', issues: [] },
  fieldConfidence: {},
  meta: null,
  confirmedFields: [],
})

describe('invoices store', () => {
  it('updates an invoice and records checked fields once', () => {
    useInvoicesStore.getState().add([entry('a'), entry('b')])
    const edited = { ...entry('a').invoice, invoice_number: 'X-1' }

    useInvoicesStore.getState().updateInvoice('a', edited)
    useInvoicesStore.getState().confirmField('a', 'issuer.tax_id')
    useInvoicesStore.getState().confirmField('a', 'issuer.tax_id')

    const [a, b] = useInvoicesStore.getState().invoices
    expect(a?.invoice.invoice_number).toBe('X-1')
    expect(a?.confirmedFields).toEqual(['issuer.tax_id'])
    expect(b?.invoice.invoice_number).toBeNull()
  })

  it('moves confidence and confirmations up when a row is removed', () => {
    useInvoicesStore.getState().add([
      {
        ...entry('a'),
        fieldConfidence: {
          'line_items.0.amount': 0.5,
          'line_items.1.amount': 0.6,
          'line_items.2.quantity': 0.4,
          'taxes.1.rate': 0.3,
          total: 0.9,
        },
        confirmedFields: ['line_items.2.quantity', 'taxes.1.rate'],
      },
    ])

    useInvoicesStore.getState().removeListPaths('a', 'line_items', 1)

    const [a] = useInvoicesStore.getState().invoices
    expect(a?.fieldConfidence).toEqual({
      'line_items.0.amount': 0.5,
      'line_items.1.quantity': 0.4,
      'taxes.1.rate': 0.3,
      total: 0.9,
    })
    expect(a?.confirmedFields).toEqual(['line_items.1.quantity', 'taxes.1.rate'])
  })

  it('flags low-confidence fields until they are checked', () => {
    const invoice = { ...entry('a'), fieldConfidence: { total: 0.98, 'issuer.tax_id': 0.62 } }
    expect(needsCheck(invoice, 'issuer.tax_id')).toBe(true)
    expect(needsCheck(invoice, 'total')).toBe(false)
    expect(needsCheck(invoice, 'issue_date')).toBe(false)
    expect(needsCheck({ ...invoice, confirmedFields: ['issuer.tax_id'] }, 'issuer.tax_id')).toBe(
      false,
    )
  })

  afterEach(() => {
    useInvoicesStore.getState().clear()
    vi.restoreAllMocks()
  })

  it('adds, removes and clears invoices, revoking their previews', () => {
    const revoke = vi.spyOn(URL, 'revokeObjectURL')
    const { add } = useInvoicesStore.getState()
    add([entry('a'), entry('b', null), entry('c')])

    useInvoicesStore.getState().remove('a')
    expect(revoke).toHaveBeenCalledWith('blob:a')
    expect(useInvoicesStore.getState().invoices.map((invoice) => invoice.id)).toEqual(['b', 'c'])

    useInvoicesStore.getState().clear()
    expect(revoke).toHaveBeenCalledWith('blob:c')
    expect(revoke).toHaveBeenCalledTimes(2)
    expect(useInvoicesStore.getState().invoices).toEqual([])
  })
})
