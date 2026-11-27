import { invoiceEur, receiptUsd } from '@/mocks/fixtures/invoices'
import { applyFormValues, emptyLineItem, emptyTax, invoiceFormSchema, toFormValues } from './schema'

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

  it('keeps an absent recipient absent and round-trips amounts', () => {
    const invoice = applyFormValues(receiptUsd, toFormValues(receiptUsd))
    expect(invoice).toEqual(receiptUsd)
  })
})

describe('line items, taxes and totals mapping', () => {
  it('writes edited amounts, adds and removes rows', () => {
    const values = toFormValues(invoiceEur)
    const [first, ...rest] = values.line_items
    if (!first) throw new Error('fixture has no line items')
    const edited = {
      ...values,
      line_items: [{ ...first, quantity: '3', amount: '2400.00' }, ...rest, emptyLineItem()],
      taxes: [],
      total: '',
    }

    const invoice = applyFormValues(invoiceEur, edited)
    expect(invoice.line_items).toHaveLength(invoiceEur.line_items.length + 1)
    expect(invoice.line_items[0]).toMatchObject({ quantity: '3', amount: '2400.00' })
    expect(invoice.line_items.at(-1)).toEqual({
      description: '',
      quantity: null,
      unit: null,
      unit_price: null,
      discount: null,
      tax_rate: null,
      amount: '0',
    })
    expect(invoice.taxes).toEqual([])
    expect(invoice.total).toBeNull()
  })

  it('keeps the previous amount while the typed text is not a number', () => {
    const values = toFormValues(invoiceEur)
    const invoice = applyFormValues(invoiceEur, {
      ...values,
      subtotal: '12a',
      taxes: values.taxes.map((tax) => ({ ...tax, amount: '' })),
    })
    expect(invoice.subtotal).toBe(invoiceEur.subtotal)
    expect(invoice.taxes.map((tax) => tax.amount)).toEqual(invoiceEur.taxes.map((t) => t.amount))
  })
})

describe('invoiceFormSchema', () => {
  const valid = toFormValues(invoiceEur)
  const issues = (values: unknown) =>
    invoiceFormSchema
      .safeParse(values)
      .error?.issues.map((issue) => [issue.path.join('.'), issue.message])

  it('accepts a complete invoice', () => {
    expect(invoiceFormSchema.safeParse(valid).success).toBe(true)
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

  it('checks amounts in lines, taxes and totals', () => {
    expect(
      issues({
        ...valid,
        line_items: [{ ...emptyLineItem(), quantity: 'dos' }],
        taxes: [{ ...emptyTax(), amount: '1.2.3' }],
        total: '1234567890123456',
      }),
    ).toEqual([
      ['line_items.0.quantity', 'review.errors.amount'],
      ['line_items.0.amount', 'review.errors.required'],
      ['taxes.0.amount', 'review.errors.amount'],
      ['total', 'review.errors.amount'],
    ])
  })
})
