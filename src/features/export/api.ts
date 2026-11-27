import { apiRequest } from '@/lib/api-client'
import type { ExportRequest } from '@/lib/api-models'
import { filenameFromContentDisposition } from '@/lib/download'

export type ExportFormat = 'excel' | 'pdf'

const EXTENSION: Record<ExportFormat, string> = { excel: 'xlsx', pdf: 'pdf' }

export interface ExportFile {
  blob: Blob
  filename: string
}

/**
 * POST /exports/{excel|pdf}. The response is the file itself; its name comes from
 * Content-Disposition (contract section 2.4), with a generic fallback.
 */
export async function exportInvoices(
  format: ExportFormat,
  body: ExportRequest,
  signal?: AbortSignal,
): Promise<ExportFile> {
  const response = await apiRequest(`/exports/${format}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })
  return {
    blob: await response.blob(),
    filename: filenameFromContentDisposition(
      response.headers.get('Content-Disposition'),
      `facturas.${EXTENSION[format]}`,
    ),
  }
}
