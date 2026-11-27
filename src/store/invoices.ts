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
  /**
   * Keeps confidence and confirmations attached to the right row after row `index` of a list
   * (`line_items`, `taxes`) is removed: its paths are dropped and later rows move up by one.
   */
  removeListPaths: (id: string, list: string, index: number) => void
}

/** "line_items.2.amount" with list "line_items" and removed index 1 → "line_items.1.amount". */
function shiftPath(path: string, list: string, removed: number): string | null {
  const prefix = `${list}.`
  if (!path.startsWith(prefix)) return path
  const [position = '', ...rest] = path.slice(prefix.length).split('.')
  const index = Number(position)
  if (!Number.isInteger(index) || index < removed) return path
  if (index === removed) return null
  return [list, index - 1, ...rest].join('.')
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
  removeListPaths: (id, list, index) => {
    set((state) => ({
      invoices: state.invoices.map((entry) => {
        if (entry.id !== id) return entry
        const fieldConfidence: Record<string, number> = {}
        for (const [path, confidence] of Object.entries(entry.fieldConfidence)) {
          const shifted = shiftPath(path, list, index)
          if (shifted !== null) fieldConfidence[shifted] = confidence
        }
        const confirmedFields = entry.confirmedFields
          .map((path) => shiftPath(path, list, index))
          .filter((path) => path !== null)
        return { ...entry, fieldConfidence, confirmedFields }
      }),
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
