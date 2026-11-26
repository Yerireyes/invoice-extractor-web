import type { Limits } from '@/lib/api-models'

/** Contract v1 limits (section 6): used until /meta answers (the free backend may be asleep). */
export const DEFAULT_LIMITS: Limits = {
  max_files_per_request: 10,
  max_file_size_mb: 10,
  max_pdf_pages: 5,
  max_invoices_per_export: 100,
}

export const DEFAULT_ACCEPTED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]

const EXTENSIONS: Record<string, string[]> = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'application/pdf': ['.pdf'],
}

/** react-dropzone `accept` map: lets the OS file picker filter by type and extension. */
export function toAcceptMap(mimeTypes: readonly string[]): Record<string, string[]> {
  return Object.fromEntries(mimeTypes.map((mime) => [mime, EXTENSIONS[mime] ?? []]))
}

/** Short labels for the helper line: "JPG, PNG, WEBP o PDF". */
export function formatLabels(mimeTypes: readonly string[]): string[] {
  return mimeTypes.map((mime) => (EXTENSIONS[mime]?.[0] ?? mime).replace('.', '').toUpperCase())
}

/**
 * Why a file can't be sent. Codes mirror the API where one exists (contract section 2.2) so the
 * same translations apply; the rest are client-only.
 */
export type SelectionProblem =
  | { code: 'UNSUPPORTED_FILE_TYPE' }
  | { code: 'FILE_TOO_LARGE'; maxMb: number }
  | { code: 'EMPTY_FILE' }
  | { code: 'TOO_MANY_FILES'; max: number }
  | { code: 'DUPLICATE_FILE' }

export interface Candidate {
  file: File
  /** Set when the picker/dropzone already rejected the type. */
  typeRejected?: boolean
}

export interface CheckedFile {
  file: File
  problem: SelectionProblem | null
}

export const fileKey = (file: File) =>
  `${file.name}::${String(file.size)}::${String(file.lastModified)}`

/**
 * Validates new files against the current selection. Pure: the caller decides what to store.
 * Order of checks: type → empty → size → duplicate → count (only valid files use up a slot).
 */
export function checkFiles(
  candidates: readonly Candidate[],
  existing: readonly CheckedFile[],
  { limits, acceptedMimeTypes }: { limits: Limits; acceptedMimeTypes: readonly string[] },
): CheckedFile[] {
  const seen = new Set(existing.map((item) => fileKey(item.file)))
  let readyCount = existing.filter((item) => item.problem === null).length
  const maxBytes = limits.max_file_size_mb * 1024 * 1024

  return candidates.map(({ file, typeRejected }) => {
    const problem = ((): SelectionProblem | null => {
      if (typeRejected || !acceptedMimeTypes.includes(file.type)) {
        return { code: 'UNSUPPORTED_FILE_TYPE' }
      }
      if (file.size === 0) return { code: 'EMPTY_FILE' }
      if (file.size > maxBytes) return { code: 'FILE_TOO_LARGE', maxMb: limits.max_file_size_mb }
      if (seen.has(fileKey(file))) return { code: 'DUPLICATE_FILE' }
      if (readyCount >= limits.max_files_per_request) {
        return { code: 'TOO_MANY_FILES', max: limits.max_files_per_request }
      }
      return null
    })()

    seen.add(fileKey(file))
    if (problem === null) readyCount++
    return { file, problem }
  })
}
