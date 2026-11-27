// Fictional sample invoices shipped in public/samples/ (synthetic data, marked as such on the
// document). They go through the real flow: extraction, review and export.

export interface SampleInvoice {
  fileName: string
  type: string
}

export const SAMPLE_INVOICES: readonly SampleInvoice[] = [
  { fileName: 'ejemplo-factura-luz-mx.png', type: 'image/png' },
  { fileName: 'ejemplo-estudio-diseno-es.pdf', type: 'application/pdf' },
  { fileName: 'ejemplo-ticket-ferreteria-us.jpg', type: 'image/jpeg' },
]

/** Fixed timestamp so the same sample is recognised as a duplicate if added twice. */
const SAMPLE_LAST_MODIFIED = Date.UTC(2026, 10, 1)

export async function loadSampleFiles(
  samples: readonly SampleInvoice[] = SAMPLE_INVOICES,
  baseUrl: string = import.meta.env.BASE_URL,
): Promise<File[]> {
  return Promise.all(
    samples.map(async ({ fileName, type }) => {
      const response = await fetch(`${baseUrl}samples/${fileName}`)
      if (!response.ok) throw new Error(`Sample ${fileName} returned ${String(response.status)}`)
      const blob = await response.blob()
      return new File([blob], fileName, { type, lastModified: SAMPLE_LAST_MODIFIED })
    }),
  )
}
