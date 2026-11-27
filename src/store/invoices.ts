import { create } from 'zustand'
import type { ExtractionMeta, Invoice, Validation } from '@/lib/api-models'

// The batch of extracted invoices, shared by upload, review and export.
// In memory only (privacy): no persistence, and object URLs are revoked when invoices leave.

export interface BatchInvoice {
  id: string
  fileName: string
  /** Original file, kept to show it next to the form and to retry. */
  file: File
  /** Object URL for images; owned by this store from the moment the invoice joins the batch. */
  previewUrl: string | null
  invoice: Invoice
  validation: Validation
  fieldConfidence: Record<string, number>
  meta: ExtractionMeta | null
  /** Low-confidence field paths the user has checked (confirmed or edited). */
  confirmedFields: string[]
}

interface InvoicesState {
  invoices: BatchInvoice[]
  add: (invoices: BatchInvoice[]) => void
  remove: (id: string) => void
  clear: () => void
  /** Replaces the invoice data after an edit (validation is refreshed separately). */
  updateInvoice: (id: string, invoice: Invoice) => void
  /** Marks a low-confidence field as checked by the user. */
  confirmField: (id: string, path: string) => void
}

function revoke(invoice: BatchInvoice) {
  if (invoice.previewUrl) URL.revokeObjectURL(invoice.previewUrl)
}

export const useInvoicesStore = create<InvoicesState>()((set, get) => ({
  invoices: [],
  add: (invoices) => {
    set((state) => ({ invoices: [...state.invoices, ...invoices] }))
  },
  remove: (id) => {
    const invoice = get().invoices.find((entry) => entry.id === id)
    if (invoice) revoke(invoice)
    set((state) => ({ invoices: state.invoices.filter((entry) => entry.id !== id) }))
  },
  clear: () => {
    get().invoices.forEach(revoke)
    set({ invoices: [] })
  },
  updateInvoice: (id, invoice) => {
    set((state) => ({
      invoices: state.invoices.map((entry) => (entry.id === id ? { ...entry, invoice } : entry)),
    }))
  },
  confirmField: (id, path) => {
    set((state) => ({
      invoices: state.invoices.map((entry) =>
        entry.id === id && !entry.confirmedFields.includes(path)
          ? { ...entry, confirmedFields: [...entry.confirmedFields, path] }
          : entry,
      ),
    }))
  },
}))

/** Confidence below this is flagged for review (contract: LOW_CONFIDENCE < 0.7). */
export const LOW_CONFIDENCE = 0.7

/** True when the AI was unsure about `path` and the user has not checked it yet. */
export function needsCheck(invoice: BatchInvoice, path: string): boolean {
  const confidence = invoice.fieldConfidence[path]
  return (
    confidence !== undefined &&
    confidence < LOW_CONFIDENCE &&
    !invoice.confirmedFields.includes(path)
  )
}
