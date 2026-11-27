// Friendly aliases over the GENERATED types (src/lib/api-types.ts). Never define API shapes by hand:
// if something is missing, request it from the backend through the mailbox.
import type { components } from './api-types'

type Schemas = components['schemas']

/**
 * Pydantic fields with a default are optional in the OpenAPI schema, but the backend always sends
 * them in responses. `Complete` makes every key present (values may still be null) so the app
 * works with one predictable shape; `normalizeInvoice`/`normalizeValidation` enforce it at the
 * boundary.
 */
type Complete<T> = { [K in keyof T]-?: Exclude<T[K], undefined> }

export type MetaResponse = Schemas['MetaResponse']
export type Limits = Schemas['Limits']
export type ProviderId = Schemas['LLMProvider']
export type ExportLanguage = Schemas['ExportLanguage']

// ---- Invoice (contract section 3) ----

/** Invoice as sent in request bodies (defaults may be omitted). */
export type InvoiceInput = Schemas['Invoice']
export type DocumentType = Schemas['DocumentType']
export type Party = Complete<Schemas['Party']>
export type LineItem = Complete<Schemas['LineItem']>
export type Tax = Complete<Schemas['Tax']>

/** Invoice as the app holds it: every key present. */
export type Invoice = Omit<
  Complete<InvoiceInput>,
  'issuer' | 'recipient' | 'line_items' | 'taxes'
> & {
  issuer: Party
  recipient: Party | null
  line_items: LineItem[]
  taxes: Tax[]
}

// ---- Validation (contract section 4) ----

export type IssueCode = Schemas['IssueCode']
export type IssueSeverity = Schemas['Severity']
export type ValidationStatus = Schemas['ValidationStatus']
export type Issue = Complete<Schemas['Issue']>
export interface Validation {
  status: ValidationStatus
  issues: Issue[]
}

// ---- Endpoints ----

export type ExtractResponse = Schemas['ExtractResponse']
export type ExtractionResult = Schemas['ExtractionResult']
export type ExtractionSuccess = Schemas['ExtractionSuccess']
export type ExtractionFailure = Schemas['ExtractionFailure']
export type FileError = Schemas['FileError']
export type FileErrorCode = Schemas['FileErrorCode']

export type ValidateRequest = Schemas['ValidateRequest']
export type ValidateResponse = Schemas['ValidateResponse']
export type ExportRequest = Schemas['ExportRequest']
export type ExportOptions = Schemas['ExportOptions']

export type ProblemDetails = Schemas['ProblemDetails']
export type ErrorCode = Schemas['ErrorCode']

// ---- Normalisation at the API boundary ----

const emptyParty = (): Party => ({
  name: null,
  tax_id: null,
  tax_id_type: null,
  address: null,
  email: null,
  phone: null,
})

function normalizeParty(party: Schemas['Party'] | null | undefined): Party {
  return { ...emptyParty(), ...party }
}

/** Fills the defaults documented in the contract (section 3) so every key is present. */
export function normalizeInvoice(raw: InvoiceInput): Invoice {
  return {
    document_type: raw.document_type,
    invoice_number: raw.invoice_number ?? null,
    issue_date: raw.issue_date ?? null,
    due_date: raw.due_date ?? null,
    currency: raw.currency ?? null,
    country: raw.country ?? null,
    language: raw.language ?? null,
    issuer: normalizeParty(raw.issuer),
    recipient: raw.recipient ? normalizeParty(raw.recipient) : null,
    line_items: (raw.line_items ?? []).map((line) => ({
      description: line.description,
      quantity: line.quantity ?? null,
      unit: line.unit ?? null,
      unit_price: line.unit_price ?? null,
      discount: line.discount ?? null,
      tax_rate: line.tax_rate ?? null,
      amount: line.amount,
    })),
    subtotal: raw.subtotal ?? null,
    discount_total: raw.discount_total ?? null,
    taxes: (raw.taxes ?? []).map((tax) => ({
      name: tax.name ?? null,
      rate: tax.rate ?? null,
      base: tax.base ?? null,
      amount: tax.amount,
    })),
    total: raw.total ?? null,
    payment_method: raw.payment_method ?? null,
    notes: raw.notes ?? null,
  }
}

export function normalizeValidation(raw: Schemas['Validation']): Validation {
  return {
    status: raw.status,
    issues: (raw.issues ?? []).map((issue) => ({
      code: issue.code,
      severity: issue.severity,
      field: issue.field ?? null,
      params: issue.params ?? {},
    })),
  }
}
