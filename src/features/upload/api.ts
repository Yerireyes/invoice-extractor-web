import { apiUpload, type UploadProgress } from '@/lib/api-client'
import type { ExtractResponse } from '@/lib/api-models'

/**
 * POST /invoices/extract. `provider` is omitted on purpose: the backend uses the default from /meta.
 * Results come back in the same order as `files` (contract section 2.2).
 */
export function extractInvoices(
  files: readonly File[],
  options: {
    onUploadProgress?: (progress: UploadProgress) => void
    onUploadDone?: () => void
    signal?: AbortSignal
  } = {},
): Promise<ExtractResponse> {
  const body = new FormData()
  files.forEach((file) => {
    body.append('files', file, file.name)
  })
  return apiUpload<ExtractResponse>('/invoices/extract', body, options)
}
