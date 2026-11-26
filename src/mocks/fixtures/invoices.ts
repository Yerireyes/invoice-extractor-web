import type { Invoice } from '@/lib/api-models'

// Fictional companies and people. Never put real invoices here.

/** MXN · services with IVA 16 %. Total is off by 10.00 → TOTAL_MISMATCH. */
export const invoiceMxn: Invoice = {
  document_type: 'invoice',
  invoice_number: 'A-00123',
  issue_date: '2026-11-20',
  due_date: '2026-12-20',
  currency: 'MXN',
  country: 'MX',
  language: 'es',
  issuer: {
    name: 'Comercial Ficticia del Norte S.A. de C.V.',
    tax_id: 'CFN010101AB1',
    tax_id_type: 'RFC',
    address: 'Av. de los Ejemplos 123, Monterrey, N.L.',
    email: 'facturacion@ficticia.example',
    phone: null,
  },
  recipient: {
    name: 'Laura Martínez Ortega',
    tax_id: 'MAOL850312XX0',
    tax_id_type: 'RFC',
    address: null,
    email: null,
    phone: null,
  },
  line_items: [
    {
      description: 'Servicio de consultoría',
      quantity: '2',
      unit: 'h',
      unit_price: '500.00',
      discount: '0.00',
      tax_rate: '16',
      amount: '1000.00',
    },
  ],
  subtotal: '1000.00',
  discount_total: '0.00',
  taxes: [{ name: 'IVA', rate: '16', base: '1000.00', amount: '160.00' }],
  total: '1150.00',
  payment_method: 'Transferencia',
  notes: null,
}

/** EUR · Spanish invoice, IVA 21 % and IRPF withholding (negative tax). Fully valid. */
export const invoiceEur: Invoice = {
  document_type: 'invoice',
  invoice_number: '2026/0457',
  issue_date: '2026-11-03',
  due_date: '2026-12-03',
  currency: 'EUR',
  country: 'ES',
  language: 'es',
  issuer: {
    name: 'Estudio Ejemplo Diseño S.L.',
    tax_id: 'B12345678',
    tax_id_type: 'NIF',
    address: 'Calle Imaginaria 7, 28001 Madrid',
    email: null,
    phone: '+34 910 000 000',
  },
  recipient: {
    name: 'Ficción Digital S.A.',
    tax_id: 'A87654321',
    tax_id_type: 'NIF',
    address: 'Paseo de la Muestra 42, Barcelona',
    email: null,
    phone: null,
  },
  line_items: [
    {
      description: 'Diseño de identidad visual',
      quantity: '1',
      unit: null,
      unit_price: '1200.00',
      discount: '0.00',
      tax_rate: '21',
      amount: '1200.00',
    },
    {
      description: 'Adaptación a redes sociales',
      quantity: '4',
      unit: 'ud',
      unit_price: '75.00',
      discount: '0.00',
      tax_rate: '21',
      amount: '300.00',
    },
  ],
  subtotal: '1500.00',
  discount_total: '0.00',
  taxes: [
    { name: 'IVA', rate: '21', base: '1500.00', amount: '315.00' },
    { name: 'IRPF', rate: '-15', base: '1500.00', amount: '-225.00' },
  ],
  total: '1590.00',
  payment_method: 'Transferencia bancaria',
  notes: 'Pago a 30 días.',
}

/** USD · store receipt. A line amount does not match quantity × price → LINE_AMOUNT_MISMATCH. */
export const receiptUsd: Invoice = {
  document_type: 'receipt',
  invoice_number: 'R-88213',
  issue_date: '2026-10-28',
  due_date: null,
  currency: 'USD',
  country: 'US',
  language: 'en',
  issuer: {
    name: 'Sample Hardware Co.',
    tax_id: '12-3456789',
    tax_id_type: 'EIN',
    address: '500 Example Ave, Brooklyn, NY',
    email: null,
    phone: null,
  },
  recipient: null,
  line_items: [
    {
      description: 'LED bulb 9W (4-pack)',
      quantity: '3',
      unit: null,
      unit_price: '12.99',
      discount: null,
      tax_rate: null,
      amount: '38.97',
    },
    {
      description: 'Extension cord 25 ft',
      quantity: '1',
      unit: null,
      unit_price: '24.50',
      discount: '2.00',
      tax_rate: null,
      amount: '24.50',
    },
  ],
  subtotal: '63.47',
  discount_total: '0.00',
  taxes: [{ name: 'Sales tax', rate: '8.875', base: '63.47', amount: '5.63' }],
  total: '69.10',
  payment_method: 'Card',
  notes: null,
}

/** GBP · credit note with no line items, due date before issue date → DUE_BEFORE_ISSUE. */
export const creditNoteGbp: Invoice = {
  document_type: 'credit_note',
  invoice_number: 'CN-0042',
  issue_date: '2026-11-15',
  due_date: '2026-11-01',
  currency: 'GBP',
  country: 'GB',
  language: 'en',
  issuer: {
    name: 'Example Utilities Ltd',
    tax_id: 'GB123456789',
    tax_id_type: 'VAT',
    address: '1 Placeholder Road, Leeds',
    email: 'billing@example-utilities.example',
    phone: null,
  },
  recipient: {
    name: 'J. Smith',
    tax_id: null,
    tax_id_type: null,
    address: null,
    email: null,
    phone: null,
  },
  line_items: [],
  subtotal: '-50.00',
  discount_total: null,
  taxes: [{ name: 'VAT', rate: '20', base: '-50.00', amount: '-10.00' }],
  total: '-60.00',
  payment_method: null,
  notes: 'Refund for overbilling in October.',
}

export interface InvoiceFixture {
  invoice: Invoice
  fieldConfidence: Record<string, number>
}

/** Rotated across successful extractions. */
export const invoiceFixtures: InvoiceFixture[] = [
  {
    invoice: invoiceMxn,
    fieldConfidence: {
      'issuer.tax_id': 0.62,
      total: 0.98,
      issue_date: 0.95,
      'line_items.0.amount': 0.91,
    },
  },
  {
    invoice: invoiceEur,
    fieldConfidence: { total: 0.99, issue_date: 0.97, 'issuer.tax_id': 0.93 },
  },
  {
    invoice: receiptUsd,
    fieldConfidence: { total: 0.94, 'line_items.1.amount': 0.58, invoice_number: 0.66 },
  },
  { invoice: creditNoteGbp, fieldConfidence: { total: 0.9, due_date: 0.72 } },
]
