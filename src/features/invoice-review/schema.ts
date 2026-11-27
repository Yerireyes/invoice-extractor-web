import { z } from 'zod'
import type { DocumentType, Invoice, Party } from '@/lib/api-models'

// Form schema for the general data of an invoice: a mirror of the contract (section 3) with the
// backend's limits. Inputs hold strings ('' = empty); the mappers convert to and from the
// contract's nullable fields. Messages are i18n keys resolved when rendering.

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

const party = z.object({
  name: shortText,
  tax_id: shortText,
  tax_id_type: shortText,
  address: longText,
  email: shortText,
  phone: shortText,
})

export const generalSchema = z
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

export type GeneralFormValues = z.infer<typeof generalSchema>
type PartyValues = GeneralFormValues['issuer']

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

const isEmptyParty = (value: Party) => Object.values(value).every((field) => field === null)

export function toFormValues(invoice: Invoice): GeneralFormValues {
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
  }
}

/** Applies the form values to the invoice; line items, taxes and totals are left untouched. */
export function applyFormValues(invoice: Invoice, values: GeneralFormValues): Invoice {
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
  }
}
