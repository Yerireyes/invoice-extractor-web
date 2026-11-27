import { get } from 'react-hook-form'
import { z } from 'zod'
import type { DocumentType, Invoice, LineItem, Party, Tax } from '@/lib/api-models'
import { API_DECIMAL } from '@/lib/money'

// Form schema of an invoice: a mirror of the contract (section 3) with the backend's limits.
// Inputs hold strings ('' = empty); amounts hold the API's decimal string once they parse (the
// money inputs convert what people type) or the raw text while they do not. The mappers convert
// to and from the contract's nullable fields. Messages are i18n keys resolved when rendering.

export const SHORT_TEXT_MAX = 300
export const LONG_TEXT_MAX = 5000

export const DOCUMENT_TYPES = [
  'invoice',
  'receipt',
  'credit_note',
  'other',
] as const satisfies readonly DocumentType[]

const shortText = z.string().max(SHORT_TEXT_MAX, { error: 'review.errors.tooLong' })
const longText = z.string().max(LONG_TEXT_MAX, { error: 'review.errors.tooLong' })
const isoDate = z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/, { error: 'review.errors.date' })

const amount = z.string().regex(/^\s*(-?\d{1,15}(\.\d{1,6})?)?\s*$/, {
  error: 'review.errors.amount',
})
const requiredAmount = amount.refine((value) => value.trim() !== '', {
  error: 'review.errors.required',
})

const lineItem = z.object({
  description: longText,
  quantity: amount,
  unit: shortText,
  unit_price: amount,
  discount: amount,
  tax_rate: amount,
  amount: requiredAmount,
})

const tax = z.object({
  name: shortText,
  rate: amount,
  base: amount,
  amount: requiredAmount,
})

const party = z.object({
  name: shortText,
  tax_id: shortText,
  tax_id_type: shortText,
  address: longText,
  email: shortText,
  phone: shortText,
})

export const invoiceFormSchema = z
  .object({
    document_type: z.enum(DOCUMENT_TYPES),
    invoice_number: shortText,
    issue_date: isoDate,
    due_date: isoDate,
    currency: z.string().max(10, { error: 'review.errors.tooLong' }),
    country: z.string().regex(/^([A-Za-z]{2})?$/, { error: 'review.errors.country' }),
    payment_method: shortText,
    notes: longText,
    issuer: party,
    recipient: party,
    line_items: z.array(lineItem),
    taxes: z.array(tax),
    subtotal: amount,
    discount_total: amount,
    total: amount,
  })
  .refine((values) => values.issue_date !== '', {
    error: 'review.errors.required',
    path: ['issue_date'],
  })
  .refine((values) => values.currency.trim() !== '', {
    error: 'review.errors.required',
    path: ['currency'],
  })
  .refine((values) => values.issuer.name.trim() !== '', {
    error: 'review.errors.required',
    path: ['issuer', 'name'],
  })

export type InvoiceFormValues = z.infer<typeof invoiceFormSchema>
type PartyValues = InvoiceFormValues['issuer']
export type LineItemValues = InvoiceFormValues['line_items'][number]
export type TaxValues = InvoiceFormValues['taxes'][number]

export const emptyLineItem = (): LineItemValues => ({
  description: '',
  quantity: '',
  unit: '',
  unit_price: '',
  discount: '',
  tax_rate: '',
  amount: '',
})

export const emptyTax = (): TaxValues => ({ name: '', rate: '', base: '', amount: '' })

const text = (value: string | null) => value ?? ''
const orNull = (value: string) => (value.trim() === '' ? null : value.trim())

function partyToValues(value: Party | null): PartyValues {
  return {
    name: text(value?.name ?? null),
    tax_id: text(value?.tax_id ?? null),
    tax_id_type: text(value?.tax_id_type ?? null),
    address: text(value?.address ?? null),
    email: text(value?.email ?? null),
    phone: text(value?.phone ?? null),
  }
}

function valuesToParty(values: PartyValues): Party {
  return {
    name: orNull(values.name),
    tax_id: orNull(values.tax_id),
    tax_id_type: orNull(values.tax_id_type),
    address: orNull(values.address),
    email: orNull(values.email),
    phone: orNull(values.phone),
  }
}

/** '' → null; a valid amount is kept; text that does not parse keeps the previous value. */
function decimal(value: string, previous: string | null | undefined): string | null {
  const trimmed = value.trim()
  if (trimmed === '') return null
  return API_DECIMAL.test(trimmed) ? trimmed : (previous ?? null)
}

/** Amounts the contract requires: an empty or invalid input keeps the previous value. */
const requiredDecimal = (value: string, previous: string | undefined) =>
  decimal(value, previous) ?? previous ?? '0'

const lineToValues = (line: LineItem): LineItemValues => ({
  description: line.description,
  quantity: text(line.quantity),
  unit: text(line.unit),
  unit_price: text(line.unit_price),
  discount: text(line.discount),
  tax_rate: text(line.tax_rate),
  amount: line.amount,
})

const valuesToLine = (values: LineItemValues, previous: LineItem | undefined): LineItem => ({
  description: values.description.trim(),
  quantity: decimal(values.quantity, previous?.quantity),
  unit: orNull(values.unit),
  unit_price: decimal(values.unit_price, previous?.unit_price),
  discount: decimal(values.discount, previous?.discount),
  tax_rate: decimal(values.tax_rate, previous?.tax_rate),
  amount: requiredDecimal(values.amount, previous?.amount),
})

const taxToValues = (value: Tax): TaxValues => ({
  name: text(value.name),
  rate: text(value.rate),
  base: text(value.base),
  amount: value.amount,
})

const valuesToTax = (values: TaxValues, previous: Tax | undefined): Tax => ({
  name: orNull(values.name),
  rate: decimal(values.rate, previous?.rate),
  base: decimal(values.base, previous?.base),
  amount: requiredDecimal(values.amount, previous?.amount),
})

const isEmptyParty = (value: Party) => Object.values(value).every((field) => field === null)

export function toFormValues(invoice: Invoice): InvoiceFormValues {
  return {
    document_type: invoice.document_type,
    invoice_number: text(invoice.invoice_number),
    issue_date: text(invoice.issue_date),
    due_date: text(invoice.due_date),
    currency: text(invoice.currency),
    country: text(invoice.country),
    payment_method: text(invoice.payment_method),
    notes: text(invoice.notes),
    issuer: partyToValues(invoice.issuer),
    recipient: partyToValues(invoice.recipient),
    line_items: invoice.line_items.map(lineToValues),
    taxes: invoice.taxes.map(taxToValues),
    subtotal: text(invoice.subtotal),
    discount_total: text(invoice.discount_total),
    total: text(invoice.total),
  }
}

/**
 * Applies the form values to the invoice. Lines and taxes are matched by position, so an amount
 * that does not parse yet keeps the value it had (the form shows the error meanwhile).
 */
export function applyFormValues(invoice: Invoice, values: InvoiceFormValues): Invoice {
  const recipient = valuesToParty(values.recipient)
  return {
    ...invoice,
    document_type: values.document_type,
    invoice_number: orNull(values.invoice_number),
    issue_date: orNull(values.issue_date),
    due_date: orNull(values.due_date),
    currency: values.currency.trim() === '' ? null : values.currency.trim().toUpperCase(),
    country: values.country.trim() === '' ? null : values.country.trim().toUpperCase(),
    payment_method: orNull(values.payment_method),
    notes: orNull(values.notes),
    issuer: valuesToParty(values.issuer),
    recipient: isEmptyParty(recipient) ? null : recipient,
    line_items: values.line_items.map((line, index) =>
      valuesToLine(line, invoice.line_items[index]),
    ),
    taxes: values.taxes.map((value, index) => valuesToTax(value, invoice.taxes[index])),
    subtotal: decimal(values.subtotal, invoice.subtotal),
    discount_total: decimal(values.discount_total, invoice.discount_total),
    total: decimal(values.total, invoice.total),
  }
}

/** Fields the form keeps but does not show (the line's unit), so nothing can jump to them. */
const HIDDEN_FIELDS = /^line_items\.\d+\.unit$/

/** Whether the form shows an input for a contract field path such as `line_items.0.amount`. */
export function hasFormField(invoice: Invoice, path: string): boolean {
  return typeof get(toFormValues(invoice), path) === 'string' && !HIDDEN_FIELDS.test(path)
}
