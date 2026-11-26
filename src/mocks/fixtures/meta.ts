import type { MetaResponse } from '@/lib/api-models'

export const meta: MetaResponse = {
  version: '1.0.0-mock',
  limits: {
    max_files_per_request: 10,
    max_file_size_mb: 10,
    max_pdf_pages: 5,
    max_invoices_per_export: 100,
  },
  accepted_mime_types: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
  providers: [
    { id: 'gemini', available: true, default: true },
    { id: 'ollama', available: false, default: false },
  ],
  export_languages: ['es', 'en'],
}
