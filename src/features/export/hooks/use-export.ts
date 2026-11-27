import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { translateApiError } from '@/i18n/messages'
import type { ExportOptions, ExportRequest } from '@/lib/api-models'
import { downloadBlob } from '@/lib/download'
import type { BatchInvoice } from '@/store/invoices'
import { exportInvoices, type ExportFormat } from '../api'

/** The contract's limit for `source_file_name`. */
const FILE_NAME_MAX = 255

export interface ExportVariables {
  format: ExportFormat
  entries: BatchInvoice[]
  options: Required<ExportOptions>
}

/**
 * The request body: each invoice as edited, with the original file's name for the "File" column.
 * Validation is not sent; the API revalidates every invoice it exports.
 */
export function toExportRequest(entries: BatchInvoice[], options: ExportOptions): ExportRequest {
  return {
    invoices: entries.map((entry) => ({
      ...entry.invoice,
      source_file_name: entry.fileName.slice(0, FILE_NAME_MAX),
    })),
    options,
  }
}

/** Generates the file, saves it with the name the API gives it and confirms with a toast. */
export function useExport({ onSuccess }: { onSuccess?: () => void } = {}) {
  const { t } = useTranslation()

  return useMutation({
    mutationFn: ({ format, entries, options }: ExportVariables) =>
      exportInvoices(format, toExportRequest(entries, options)),
    onSuccess: ({ blob, filename }) => {
      downloadBlob(blob, filename)
      toast.success(t('export.done', { filename }))
      onSuccess?.()
    },
    onError: (error) => {
      toast.error(translateApiError(t, error))
    },
  })
}
