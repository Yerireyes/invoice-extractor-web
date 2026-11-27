import { invoiceEur, receiptUsd } from '@/mocks/fixtures/invoices'
import { applyFormValues, generalSchema, toFormValues } from './schema'

describe('general form mapping', () => {
  it('maps nullable contract fields to strings and back without changes', () => {
    const values = toFormValues(invoiceEur)
    expect(values.due_date).toBe('2026-12-03')
    expect(values.issuer.email).toBe('')

    expect(applyFormValues(invoiceEur, values)).toEqual(invoiceEur)
  })

  it('turns empty inputs into null, trims, and upper-cases codes', () => {
    const values = {
      ...toFormValues(invoiceEur),
      invoice_number: '  ',
      notes: '  Pagada  ',
      currency: 'eur ',
      country: 'es',
    }
    const invoice = applyFormValues(invoiceEur, values)
    expect(invoice.invoice_number).toBeNull()
    expect(invoice.notes).toBe('Pagada')
    expect(invoice.currency).toBe('EUR')
    expect(invoice.country).toBe('ES')
  })

  it('keeps an absent recipient absent and leaves amounts untouched', () => {
    const invoice = applyFormValues(receiptUsd, toFormValues(receiptUsd))
    expect(invoice.recipient).toBeNull()
    expect(invoice.line_items).toBe(receiptUsd.line_items)
    expect(invoice.total).toBe(receiptUsd.total)
  })
})

describe('generalSchema', () => {
  const valid = toFormValues(invoiceEur)
  const issues = (values: unknown) =>
    generalSchema
      .safeParse(values)
      .error?.issues.map((issue) => [issue.path.join('.'), issue.message])

  it('accepts a complete invoice', () => {
    expect(generalSchema.safeParse(valid).success).toBe(true)
  })

  it('requires issue date, currency and issuer name', () => {
    expect(
      issues({ ...valid, issue_date: '', currency: ' ', issuer: { ...valid.issuer, name: '' } }),
    ).toEqual([
      ['issue_date', 'review.errors.required'],
      ['currency', 'review.errors.required'],
      ['issuer.name', 'review.errors.required'],
    ])
  })

  it('enforces the contract limits and formats', () => {
    expect(
      issues({
        ...valid,
        invoice_number: 'x'.repeat(301),
        due_date: '03/12/2026',
        country: 'ESP',
      }),
    ).toEqual([
      ['invoice_number', 'review.errors.tooLong'],
      ['due_date', 'review.errors.date'],
      ['country', 'review.errors.country'],
    ])
  })
})
