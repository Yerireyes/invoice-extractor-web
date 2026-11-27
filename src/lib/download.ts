// File downloads from API responses: the name comes from Content-Disposition, the bytes from a Blob.

/**
 * File name from a Content-Disposition header. Prefers the RFC 5987 form
 * (`filename*=UTF-8''facturas%20%C3%B1.xlsx`) over the plain one (`filename="facturas.xlsx"`),
 * strips any path, and returns `fallback` when there is none.
 */
export function filenameFromContentDisposition(header: string | null, fallback: string): string {
  if (!header) return fallback

  const extended = /filename\*\s*=\s*([^']*)'[^']*'([^;]+)/i.exec(header)
  let name: string | undefined
  if (extended?.[2]) {
    try {
      name = decodeURIComponent(extended[2].trim().replace(/^"|"$/g, ''))
    } catch {
      name = undefined
    }
  }
  if (!name) {
    const plain = /filename\s*=\s*("([^"]*)"|[^;]+)/i.exec(header)
    name = (plain?.[2] ?? plain?.[1])?.trim()
  }

  const base = name?.split(/[\\/]/).pop()?.trim()
  return base === undefined || base === '' ? fallback : base
}

/** Saves a Blob with the given name through a temporary object URL (revoked right after). */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.display = 'none'
  document.body.append(link)
  link.click()
  link.remove()
  // Revoke on the next task: some browsers start the download asynchronously.
  setTimeout(() => {
    URL.revokeObjectURL(url)
  }, 0)
}
