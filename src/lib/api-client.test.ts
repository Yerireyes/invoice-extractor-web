import { http, HttpResponse } from 'msw'
import { server } from '@/mocks/node'
import {
  ApiError,
  apiFetch,
  apiRequest,
  apiUrl,
  CLIENT_ERROR_CODES,
  getApiBaseUrl,
  isAbortError,
  isApiError,
} from './api-client'

describe('apiUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('builds the URL from VITE_API_URL plus /api/v1, trimming trailing slashes', () => {
    vi.stubEnv('VITE_API_URL', 'https://api.example.com/')
    expect(getApiBaseUrl()).toBe('https://api.example.com/api/v1')
    expect(apiUrl('/meta')).toBe('https://api.example.com/api/v1/meta')
    expect(apiUrl('meta')).toBe('https://api.example.com/api/v1/meta')
  })

  it('falls back to a same-origin path when VITE_API_URL is empty', () => {
    vi.stubEnv('VITE_API_URL', '')
    expect(apiUrl('/health')).toBe('/api/v1/health')
  })
})

describe('apiFetch', () => {
  it('returns the parsed JSON body', async () => {
    await expect(apiFetch('/health')).resolves.toEqual({ status: 'ok' })
  })

  it('serialises a json body and sends the content type', async () => {
    let received: { contentType: string | null; body: unknown } | undefined
    server.use(
      http.post('*/api/v1/echo', async ({ request }) => {
        received = { contentType: request.headers.get('content-type'), body: await request.json() }
        return HttpResponse.json({ ok: true })
      }),
    )

    await apiFetch('/echo', { method: 'POST', json: { a: 1 } })

    expect(received).toEqual({ contentType: 'application/json', body: { a: 1 } })
  })

  it('turns an RFC 9457 problem into an ApiError with code, status and params', async () => {
    server.use(
      http.get('*/api/v1/meta', () =>
        HttpResponse.json(
          {
            type: 'about:blank',
            title: 'Too many requests',
            status: 429,
            code: 'RATE_LIMITED',
            detail: 'Slow down',
            params: { retry_after_s: 30 },
          },
          { status: 429, headers: { 'Content-Type': 'application/problem+json' } },
        ),
      ),
    )

    const error = await apiFetch('/meta').catch((e: unknown) => e)

    expect(isApiError(error)).toBe(true)
    expect(error).toMatchObject({
      code: 'RATE_LIMITED',
      status: 429,
      params: { retry_after_s: 30 },
      detail: 'Slow down',
      isClientError: true,
    })
  })

  it('uses UNKNOWN_ERROR when the error body is not a problem document', async () => {
    server.use(
      http.get(
        '*/api/v1/meta',
        () => new HttpResponse('<html>Bad gateway</html>', { status: 502 }),
      ),
    )

    const error = await apiFetch('/meta').catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({
      code: CLIENT_ERROR_CODES.unknown,
      status: 502,
      params: {},
      isClientError: false,
    })
  })

  it('uses empty params when the problem has none', async () => {
    server.use(
      http.get('*/api/v1/meta', () =>
        HttpResponse.json({ code: 'INTERNAL_ERROR' }, { status: 500 }),
      ),
    )

    await expect(apiFetch('/meta')).rejects.toMatchObject({ code: 'INTERNAL_ERROR', params: {} })
  })

  it('maps a network failure to NETWORK_ERROR with status 0', async () => {
    server.use(http.get('*/api/v1/meta', () => HttpResponse.error()))

    await expect(apiFetch('/meta')).rejects.toMatchObject({
      code: CLIENT_ERROR_CODES.network,
      status: 0,
    })
  })

  it('re-throws aborts untouched so callers can ignore stale requests', async () => {
    const controller = new AbortController()
    controller.abort()

    const error = await apiRequest('/health', { signal: controller.signal }).catch(
      (e: unknown) => e,
    )

    expect(isAbortError(error)).toBe(true)
    expect(isApiError(error)).toBe(false)
  })
})
