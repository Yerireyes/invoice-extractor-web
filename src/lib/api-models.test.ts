import { normalizeInvoice, normalizeValidation } from './api-models'

describe('normalizeInvoice', () => {
  it('fills the contract defaults so every key is present', () => {
    const invoice = normalizeInvoice({
      document_type: 'invoice',
      line_items: [{ description: 'Café', amount: '3.50' }],
      taxes: [{ amount: '0.56' }],
    })

    expect(invoice).toEqual({
      document_type: 'invoice',
      invoice_number: null,
      issue_date: null,
      due_date: null,
      currency: null,
      country: null,
      language: null,
      issuer: {
        name: null,
        tax_id: null,
        tax_id_type: null,
        address: null,
        email: null,
        phone: null,
      },
      recipient: null,
      line_items: [
        {
          description: 'Café',
          quantity: null,
          unit: null,
          unit_price: null,
          discount: null,
          tax_rate: null,
          amount: '3.50',
        },
      ],
      subtotal: null,
      discount_total: null,
      taxes: [{ name: null, rate: null, base: null, amount: '0.56' }],
      total: null,
      payment_method: null,
      notes: null,
    })
  })

  it('keeps the values it receives, including a partial recipient', () => {
    const invoice = normalizeInvoice({
      document_type: 'receipt',
      currency: 'EUR',
      total: '10.00',
      issuer: { name: 'Tienda Ejemplo' },
      recipient: { tax_id: 'B12345678' },
      line_items: [],
    })

    expect(invoice.document_type).toBe('receipt')
    expect(invoice.currency).toBe('EUR')
    expect(invoice.issuer.name).toBe('Tienda Ejemplo')
    expect(invoice.recipient).toMatchObject({ name: null, tax_id: 'B12345678' })
    expect(invoice.taxes).toEqual([])
  })
})

describe('normalizeValidation', () => {
  it('defaults missing issues, fields and params', () => {
    expect(normalizeValidation({ status: 'valid' })).toEqual({ status: 'valid', issues: [] })
    expect(
      normalizeValidation({
        status: 'warnings',
        issues: [{ code: 'DUE_BEFORE_ISSUE', severity: 'warning' }],
      }),
    ).toEqual({
      status: 'warnings',
      issues: [{ code: 'DUE_BEFORE_ISSUE', severity: 'warning', field: null, params: {} }],
    })
  })
})
