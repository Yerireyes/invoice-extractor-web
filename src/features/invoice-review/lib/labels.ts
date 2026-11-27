import type { TFunction } from 'i18next'
import type { BatchInvoice } from '@/store/invoices'

/** How an invoice is named in lists and headings: issuer, else file name. */
export function issuerLabel(t: TFunction, entry: BatchInvoice): string {
  return entry.invoice.issuer.name ?? (entry.fileName || t('review.batch.noIssuer'))
}
