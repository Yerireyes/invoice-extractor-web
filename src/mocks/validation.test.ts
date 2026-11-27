import type { Invoice } from '@/lib/api-models'
import { creditNoteGbp, invoiceEur, receiptUsd } from './fixtures/invoices'
import { validateInvoice } from './validation'

const codes = (invoice: Invoice, confidence?: Record<string, number>) =>
  validateInvoice(invoice, confidence).issues.map((issue) => issue.code)

describe('mock validateInvoice', () => {
  it('accepts amounts within the ±0.02 tolerance', () => {
    expect(validateInvoice({ ...invoiceEur, total: '1590.02' }).status).toBe('valid')
  })

  it('flags a line whose amount does not match quantity × price − discount', () => {
    const result = validateInvoice(receiptUsd)
    expect(result.status).toBe('warnings')
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: 'LINE_AMOUNT_MISMATCH',
        field: 'line_items.1.amount',
        params: { line: 1, expected: '22.50', actual: '24.50' },
      }),
    )
  })

  it('flags a due date before the issue date', () => {
    expect(codes(creditNoteGbp)).toEqual(['DUE_BEFORE_ISSUE'])
  })

  it('flags missing required fields and invalid currency as errors', () => {
    const broken: Invoice = {
      ...invoiceEur,
      currency: 'euro',
      issuer: { ...invoiceEur.issuer, name: '' },
    }
    const result = validateInvoice(broken)
    expect(result.status).toBe('invalid')
    expect(result.issues.map((i) => i.code)).toEqual(['MISSING_REQUIRED_FIELD', 'INVALID_CURRENCY'])
  })

  it('flags subtotal and tax mismatches', () => {
    const edited: Invoice = {
      ...invoiceEur,
      subtotal: '1400.00',
      taxes: [{ name: 'IVA', rate: '21', base: '1500.00', amount: '300.00' }],
      total: '1700.00',
    }
    expect(codes(edited)).toEqual(['SUBTOTAL_MISMATCH', 'TAX_MISMATCH'])
  })

  it('skips arithmetic rules when the fields involved are null', () => {
    const partial: Invoice = {
      ...invoiceEur,
      subtotal: null,
      line_items: [
        {
          description: 'x',
          quantity: null,
          unit: null,
          unit_price: null,
          discount: null,
          tax_rate: null,
          amount: '5.00',
        },
      ],
      taxes: [{ name: 'IVA', rate: null, base: null, amount: '1.00' }],
    }
    expect(validateInvoice(partial).status).toBe('valid')
  })

  it('flags issue dates in the future', () => {
    expect(codes({ ...invoiceEur, issue_date: '2999-01-01', due_date: null })).toEqual([
      'FUTURE_DATE',
    ])
  })

  it('reports low confidence fields as info', () => {
    const result = validateInvoice(invoiceEur, { total: 0.5, issue_date: 0.9 })
    expect(result.status).toBe('warnings')
    expect(result.issues).toEqual([
      { code: 'LOW_CONFIDENCE', severity: 'info', field: 'total', params: { confidence: 0.5 } },
    ])
  })
})
