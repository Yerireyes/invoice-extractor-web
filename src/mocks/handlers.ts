import { delay, http, HttpResponse } from 'msw'
import { normalizeInvoice } from '@/lib/api-models'
import type {
  ExportRequest,
  ExtractionResult,
  ExtractResponse,
  FileError,
  ErrorCode,
  ProblemDetails,
  ValidateRequest,
  ValidateResponse,
} from '@/lib/api-models'
import { invoiceFixtures } from './fixtures/invoices'
import { meta } from './fixtures/meta'
import { validateInvoice } from './validation'

// Matches any origin, so mocks work with or without VITE_API_URL.
const api = (path: string) => `*/api/v1${path}`

const isTest = import.meta.env.MODE === 'test'

/** Simulated latency in the browser; instant in tests. */
const latency = (ms: number) => delay(isTest ? 0 : ms)

/** Standard HTTP reason phrases, as the backend sends in `title` (never shown to users). */
const REASON_PHRASES: Record<number, string> = {
  400: 'Bad Request',
  404: 'Not Found',
  405: 'Method Not Allowed',
  422: 'Unprocessable Content',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
  503: 'Service Unavailable',
}

function problem(
  status: number,
  code: ErrorCode,
  params: Record<string, unknown> = {},
  headers?: HeadersInit,
) {
  const body: ProblemDetails = {
    type: 'about:blank',
    title: REASON_PHRASES[status] ?? 'Error',
    status,
    code,
    detail: null,
    params,
  }
  const finalHeaders = new Headers(headers)
  finalHeaders.set('Content-Type', 'application/problem+json')
  return HttpResponse.json(body, { status, headers: finalHeaders })
}

/**
 * File names that trigger scenarios, handy for manual testing in `npm run dev:mock`:
 * - perro / dog / not-invoice / no-factura → NOT_AN_INVOICE
 * - borrosa / blurry                       → UNREADABLE_FILE
 * - rate-limit                             → whole request 429 RATE_LIMITED
 * - quota                                  → whole request 503 LLM_QUOTA_EXCEEDED
 * - offline                                → whole request 503 LLM_UNAVAILABLE
 */
export const MOCK_TRIGGERS = {
  notAnInvoice: /perro|dog|not-invoice|no-factura/i,
  unreadable: /borrosa|blurry/i,
  rateLimited: /rate-limit/i,
  quota: /quota/i,
  unavailable: /offline/i,
} as const

function fileError(file: File): FileError | null {
  const { limits, accepted_mime_types } = meta
  if (!accepted_mime_types.includes(file.type)) {
    return {
      code: 'UNSUPPORTED_FILE_TYPE',
      params: { mime_type: file.type || null },
    }
  }
  if (file.size > limits.max_file_size_mb * 1024 * 1024) {
    return { code: 'FILE_TOO_LARGE', params: { max_mb: limits.max_file_size_mb } }
  }
  if (MOCK_TRIGGERS.notAnInvoice.test(file.name)) return { code: 'NOT_AN_INVOICE', params: {} }
  if (MOCK_TRIGGERS.unreadable.test(file.name)) return { code: 'UNREADABLE_FILE', params: {} }
  return null
}

function timestamp(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`
}

/** Smallest valid one-page PDF, so the mock download opens in a viewer. */
const MOCK_PDF = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj
4 0 obj<</Length 52>>stream
BT /F1 18 Tf 72 770 Td (Mock export - Invoice Extractor) Tj ET
endstream endobj
5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
trailer<</Root 1 0 R>>
%%EOF`

function exportHandler(kind: 'excel' | 'pdf') {
  const ext = kind === 'excel' ? 'xlsx' : 'pdf'
  const contentType =
    kind === 'excel'
      ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      : 'application/pdf'

  return http.post(api(`/exports/${kind}`), async ({ request }) => {
    const body = (await request.json()) as Partial<ExportRequest> | null
    // `options` is optional (the API applies defaults); an empty list is rejected.
    if (!body || !Array.isArray(body.invoices) || body.invoices.length === 0) {
      return problem(422, 'VALIDATION_ERROR', {
        errors: [
          { loc: ['body', 'invoices'], msg: 'List should have at least 1 item', type: 'too_short' },
        ],
      })
    }
    const max = meta.limits.max_invoices_per_export
    if (body.invoices.length > max) {
      return problem(422, 'TOO_MANY_INVOICES', { max_invoices: max })
    }
    await latency(800)
    // Excel is a placeholder in mock mode (not a real workbook); the PDF is a minimal valid file.
    const content = kind === 'pdf' ? MOCK_PDF : `Mock export of ${body.invoices.length} invoice(s)`
    return new HttpResponse(content, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="facturas_${timestamp()}.${ext}"`,
      },
    })
  })
}

export const handlers = [
  http.get(api('/health'), () => HttpResponse.json({ status: 'ok' as const })),

  http.get(api('/meta'), async () => {
    await latency(200)
    return HttpResponse.json(meta)
  }),

  http.post(api('/invoices/extract'), async ({ request }) => {
    const form = await request.formData()
    const files = form.getAll('files').filter((entry): entry is File => typeof entry !== 'string')
    const { max_files_per_request } = meta.limits

    if (files.length === 0) return problem(422, 'NO_FILES')
    if (files.length > max_files_per_request) {
      return problem(422, 'TOO_MANY_FILES', {
        max_files: max_files_per_request,
      })
    }

    const names = files.map((f) => f.name).join(' ')
    if (MOCK_TRIGGERS.rateLimited.test(names)) {
      return problem(429, 'RATE_LIMITED', { retry_after_s: 30 }, { 'Retry-After': '30' })
    }
    // The daily cap: retry_after_s counts the hours until the reset.
    if (MOCK_TRIGGERS.quota.test(names)) {
      return problem(503, 'LLM_QUOTA_EXCEEDED', { retry_after_s: 5 * 3600 })
    }
    if (MOCK_TRIGGERS.unavailable.test(names)) return problem(503, 'LLM_UNAVAILABLE')

    await latency(900 + 600 * files.length)

    let successIndex = 0
    const results: ExtractionResult[] = files.map((file) => {
      const error = fileError(file)
      if (error) return { file_name: file.name, status: 'error', error }

      const fixture = invoiceFixtures[successIndex++ % invoiceFixtures.length]
      if (!fixture) throw new Error('Missing invoice fixtures')
      const invoice = structuredClone(fixture.invoice)
      return {
        file_name: file.name,
        status: 'success',
        invoice,
        validation: validateInvoice(invoice, fixture.fieldConfidence),
        field_confidence: fixture.fieldConfidence,
        meta: {
          provider: 'gemini',
          model: 'mock-model',
          pages: 1,
          processing_ms: 1800 + Math.round(Math.random() * 1500),
        },
      }
    })

    const succeeded = results.filter((r) => r.status === 'success').length
    const response: ExtractResponse = {
      results,
      summary: { total: results.length, succeeded, failed: results.length - succeeded },
    }
    return HttpResponse.json(response)
  }),

  http.post(api('/invoices/validate'), async ({ request }) => {
    const body = (await request.json()) as Partial<ValidateRequest> | null
    if (!body?.invoice) {
      return problem(422, 'VALIDATION_ERROR', {
        errors: [{ loc: ['body', 'invoice'] }],
      })
    }
    await latency(250)
    const response: ValidateResponse = {
      validation: validateInvoice(normalizeInvoice(body.invoice)),
    }
    return HttpResponse.json(response)
  }),

  exportHandler('excel'),
  exportHandler('pdf'),
]
