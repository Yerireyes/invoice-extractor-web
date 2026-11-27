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
}

interface InvoicesState {
  invoices: BatchInvoice[]
  add: (invoices: BatchInvoice[]) => void
  remove: (id: string) => void
  clear: () => void
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
}))
