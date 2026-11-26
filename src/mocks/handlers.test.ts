// Contract tests for the MSW handlers: the UI is built against these, so they must behave like the API.
import { apiFetch, apiRequest, isApiError } from '@/lib/api-client'
import type { ExtractResponse, ExportRequest, ValidateResponse } from '@/lib/api-models'
import { invoiceEur, invoiceMxn } from './fixtures/invoices'

const image = (name: string, type = 'image/jpeg', size = 1024) =>
  new File([new Uint8Array(size)], name, { type })

function extract(files: File[]) {
  const body = new FormData()
  files.forEach((file) => {
    body.append('files', file)
  })
  return apiFetch<ExtractResponse>('/invoices/extract', { method: 'POST', body })
}

const exportBody: ExportRequest = {
  invoices: [invoiceEur],
  options: { language: 'es', include_line_items: true, include_alerts: true },
}

describe('mock /invoices/extract', () => {
  it('returns a partial success with NOT_AN_INVOICE for non-invoice files', async () => {
    const response = await extract([image('factura_luz.jpg'), image('foto_perro.png', 'image/png')])

    expect(response.summary).toEqual({ total: 2, succeeded: 1, failed: 1 })
    const [ok, failed] = response.results
    expect(ok?.status).toBe('success')
    expect(failed).toEqual({
      file_name: 'foto_perro.png',
      status: 'error',
      error: { code: 'NOT_AN_INVOICE', params: {} },
    })
  })

  it('includes validation issues and field confidence in successful results', async () => {
    const { results } = await extract([image('a.jpg')])
    const result = results[0]
    if (result?.status !== 'success') throw new Error('expected success')

    expect(result.validation.status).toBe('invalid')
    expect(result.validation.issues.map((i) => i.code)).toEqual(
      expect.arrayContaining(['TOTAL_MISMATCH', 'LOW_CONFIDENCE']),
    )
    expect(result.field_confidence['issuer.tax_id']).toBeLessThan(0.7)
  })

  it('rotates fixtures with different currencies', async () => {
    const { results } = await extract([
      image('1.jpg'),
      image('2.jpg'),
      image('3.pdf', 'application/pdf'),
    ])
    const currencies = results.map((r) => (r.status === 'success' ? r.invoice.currency : null))
    expect(currencies).toEqual(['MXN', 'EUR', 'USD'])
  })

  it.each([
    [image('x.gif', 'image/gif'), 'UNSUPPORTED_FILE_TYPE'],
    [image('huge.jpg', 'image/jpeg', 10 * 1024 * 1024 + 1), 'FILE_TOO_LARGE'],
    [image('ticket-borrosa.jpg'), 'UNREADABLE_FILE'],
  ])('reports per-file error for %s', async (file, code) => {
    const { results } = await extract([file])
    expect(results[0]).toMatchObject({ status: 'error', error: { code } })
  })

  it.each([
    [[], 422, 'NO_FILES'],
    [Array.from({ length: 11 }, (_, i) => image(`${i}.jpg`)), 422, 'TOO_MANY_FILES'],
    [[image('rate-limit.jpg')], 429, 'RATE_LIMITED'],
    [[image('quota.jpg')], 503, 'LLM_QUOTA_EXCEEDED'],
    [[image('offline.jpg')], 503, 'LLM_UNAVAILABLE'],
  ])('fails the whole request (%#) with %i %s', async (files, status, code) => {
    const error = await extract(files).catch((e: unknown) => e)
    expect(isApiError(error)).toBe(true)
    expect(error).toMatchObject({ status, code })
  })

  it('tells how long to wait when rate limited', async () => {
    await expect(extract([image('rate-limit.jpg')])).rejects.toMatchObject({
      params: { retry_after_s: 30 },
    })
  })
})

describe('mock /invoices/validate', () => {
  const validate = (invoice: unknown) =>
    apiFetch<ValidateResponse>('/invoices/validate', { method: 'POST', json: { invoice } })

  it('reports a valid invoice as valid', async () => {
    await expect(validate(invoiceEur)).resolves.toEqual({
      validation: { status: 'valid', issues: [] },
    })
  })

  it('recomputes issues after an edit fixes the total', async () => {
    const before = await validate(invoiceMxn)
    expect(before.validation.issues[0]).toMatchObject({
      code: 'TOTAL_MISMATCH',
      field: 'total',
      params: { expected: '1160.00', actual: '1150.00' },
    })

    const after = await validate({ ...invoiceMxn, total: '1160.00' })
    expect(after.validation.status).toBe('valid')
  })

  it('rejects a body without invoice', async () => {
    await expect(
      apiFetch('/invoices/validate', { method: 'POST', json: {} }),
    ).rejects.toMatchObject({ status: 422, code: 'VALIDATION_ERROR' })
  })
})

describe('mock /exports', () => {
  it.each([
    ['excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'xlsx'],
    ['pdf', 'application/pdf', 'pdf'],
  ])('returns a %s download with a Content-Disposition filename', async (kind, type, ext) => {
    const response = await apiRequest(`/exports/${kind}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(exportBody),
    })

    expect(response.headers.get('Content-Type')).toBe(type)
    expect(response.headers.get('Content-Disposition')).toMatch(
      new RegExp(`^attachment; filename="facturas_\\d{8}_\\d{4}\\.${ext}"$`),
    )
    expect((await response.blob()).size).toBeGreaterThan(0)
  })

  it('rejects more invoices than the export limit', async () => {
    const body = { ...exportBody, invoices: Array.from({ length: 101 }, () => invoiceEur) }
    await expect(apiFetch('/exports/pdf', { method: 'POST', json: body })).rejects.toMatchObject({
      status: 422,
      code: 'TOO_MANY_INVOICES',
      params: { max_invoices: 100 },
    })
  })

  it('rejects an invalid body', async () => {
    await expect(apiFetch('/exports/excel', { method: 'POST', json: {} })).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    })
  })
})

describe('mock /health', () => {
  it('is up', async () => {
    await expect(apiFetch('/health')).resolves.toEqual({ status: 'ok' })
  })
})
