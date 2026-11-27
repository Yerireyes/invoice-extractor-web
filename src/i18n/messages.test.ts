import { ApiError } from '@/lib/api-client'
import type { Issue } from '@/lib/api-models'
import i18n from '.'
import { fieldLabel, translateApiError, translateFileError, translateIssue } from './messages'

/** Intl uses narrow/no-break spaces; normalise them for readable assertions. */
const plain = (text: string) => text.replace(/\s/g, ' ')

const t = i18n.t.bind(i18n)

describe('translateApiError', () => {
  it('interpolates retry_after_s with plural forms', async () => {
    const error = (seconds: number) =>
      new ApiError({ code: 'RATE_LIMITED', status: 429, params: { retry_after_s: seconds } })

    expect(translateApiError(t, error(30))).toBe(
      'Has hecho demasiadas peticiones. Espera 30 segundos y vuelve a intentarlo.',
    )
    expect(translateApiError(t, error(1))).toContain('Espera 1 segundo y')

    await i18n.changeLanguage('en')
    expect(translateApiError(t, error(30))).toBe(
      'Too many requests. Wait 30 seconds and try again.',
    )
  })

  it('uses the generic wording when a guaranteed param is missing', () => {
    expect(translateApiError(t, new ApiError({ code: 'RATE_LIMITED', status: 429 }))).toBe(
      'Has hecho demasiadas peticiones. Espera un momento y vuelve a intentarlo.',
    )
  })

  it('interpolates max_files for TOO_MANY_FILES', () => {
    const error = new ApiError({ code: 'TOO_MANY_FILES', status: 422, params: { max_files: 10 } })
    expect(translateApiError(t, error)).toBe('Puedes subir como máximo 10 archivos a la vez.')
  })

  it('translates client-side network errors', () => {
    expect(translateApiError(t, new ApiError({ code: 'NETWORK_ERROR', status: 0 }))).toMatch(
      /conexión/,
    )
  })

  it('falls back to a generic message for unknown codes and non-API errors', () => {
    const generic = 'Algo salió mal. Inténtalo de nuevo en unos momentos.'
    expect(translateApiError(t, new ApiError({ code: 'BRAND_NEW_CODE', status: 418 }))).toBe(
      generic,
    )
    expect(translateApiError(t, new Error('boom'))).toBe(
      'El servidor respondió con un error inesperado. Vuelve a intentarlo.',
    )
  })
})

describe('translateFileError', () => {
  it('translates known per-file codes and falls back for unknown ones', () => {
    expect(translateFileError(t, { code: 'NOT_AN_INVOICE', params: {} })).toBe(
      'No parece una factura ni un recibo.',
    )
    expect(translateFileError(t, { code: 'SOMETHING_NEW', params: {} })).toBe(
      'No pudimos procesar este archivo.',
    )
  })
})

describe('fieldLabel', () => {
  it.each([
    ['total', 'Total'],
    ['issuer.tax_id', 'ID fiscal del emisor'],
    ['line_items.0.amount', 'Importe (concepto 1)'],
    ['taxes.2.rate', 'Tasa (impuesto 3)'],
    ['unknown.path', 'unknown.path'],
  ])('%s → %s', (path, label) => {
    expect(fieldLabel(t, path)).toBe(label)
  })
})

describe('translateIssue', () => {
  const issue = (overrides: Partial<Issue>): Issue => ({
    code: 'TOTAL_MISMATCH',
    severity: 'error',
    field: 'total',
    params: {},
    ...overrides,
  })

  it('formats amounts in the invoice currency and active locale', async () => {
    const totalMismatch = issue({ params: { expected: '1160.00', actual: '1150.00' } })

    expect(plain(translateIssue(t, totalMismatch, { currency: 'MXN', locale: 'es-MX' }))).toBe(
      'El total no cuadra: según el subtotal, los descuentos y los impuestos debería ser $1,160.00, pero es $1,150.00.',
    )

    await i18n.changeLanguage('en')
    expect(plain(translateIssue(t, totalMismatch, { currency: 'EUR', locale: 'en-US' }))).toBe(
      "The total doesn't add up: based on the subtotal, discounts and taxes it should be €1,160.00, but it is €1,150.00.",
    )
  })

  it('names the missing field', () => {
    const missing = issue({ code: 'MISSING_REQUIRED_FIELD', field: 'issuer.name' })
    expect(translateIssue(t, missing, { currency: 'EUR', locale: 'es' })).toBe(
      'Falta un dato obligatorio: Nombre del emisor.',
    )
  })

  it('shows 1-based numbers for line and tax positions', () => {
    const tax = issue({
      code: 'TAX_MISMATCH',
      field: 'taxes.0.amount',
      params: { index: 0, expected: '160.00', actual: '150.00' },
    })
    expect(plain(translateIssue(t, tax, { currency: 'USD', locale: 'en-US' }))).toBe(
      'Impuesto 1: el importe debería ser $160.00 (base × tasa), pero es $150.00.',
    )
  })

  it('formats confidence as a percentage', () => {
    const low = issue({
      code: 'LOW_CONFIDENCE',
      severity: 'info',
      field: 'issuer.tax_id',
      params: { confidence: 0.62 },
    })
    expect(plain(translateIssue(t, low, { currency: 'MXN', locale: 'es-MX' }))).toBe(
      'La IA no está segura de este dato (62% de confianza). Revísalo con la imagen original.',
    )
  })

  it('falls back for unknown issue codes', () => {
    expect(
      translateIssue(t, issue({ code: 'NEW_RULE' as unknown as Issue['code'] }), {
        currency: 'MXN',
        locale: 'es',
      }),
    ).toBe('Hay un problema con este dato.')
  })
})

describe('contract params (section 2.2 and 5)', () => {
  it('interpolates the export limit and optional retry_after_s on 503', () => {
    expect(
      translateApiError(
        t,
        new ApiError({ code: 'TOO_MANY_INVOICES', status: 422, params: { max_invoices: 100 } }),
      ),
    ).toBe('Puedes exportar como máximo 100 facturas a la vez. Selecciona menos.')
    expect(
      translateApiError(
        t,
        new ApiError({ code: 'LLM_UNAVAILABLE', status: 503, params: { retry_after_s: 30 } }),
      ),
    ).toBe('El servicio de IA no responde. Vuelve a intentarlo en 30 segundos.')
    expect(translateApiError(t, new ApiError({ code: 'LLM_UNAVAILABLE', status: 503 }))).toBe(
      'El servicio de IA no responde. Vuelve a intentarlo en unos minutos.',
    )
  })

  it('details per-file size and page limits when the params are present', () => {
    expect(translateFileError(t, { code: 'FILE_TOO_LARGE', params: { max_mb: 10 } })).toBe(
      'El archivo supera el máximo de 10 MB.',
    )
    expect(
      translateFileError(t, { code: 'PDF_TOO_MANY_PAGES', params: { max_pages: 5, pages: 8 } }),
    ).toBe('El PDF tiene 8 páginas y el máximo es 5.')
    expect(translateFileError(t, { code: 'PDF_TOO_MANY_PAGES', params: {} })).toBe(
      'El PDF tiene más páginas de las permitidas.',
    )
  })

  it('shows 0-based line params as 1-based', () => {
    const line: Issue = {
      code: 'LINE_AMOUNT_MISMATCH',
      severity: 'warning',
      field: 'line_items.1.amount',
      params: { line: 1, expected: '22.50', actual: '24.50' },
    }
    expect(translateIssue(t, line, { currency: 'USD', locale: 'en-US' })).toBe(
      'Concepto 2: el importe debería ser $22.50 (cantidad × precio − descuento), pero es $24.50.',
    )
  })
})
