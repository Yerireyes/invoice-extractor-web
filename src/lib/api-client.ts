// Typed fetch wrapper for the Invoice Extractor API.
// Errors are normalised to ApiError { code, status, params } from RFC 9457 Problem Details;
// user-facing text is resolved later through i18n (errors.<CODE>).

export const API_PREFIX = '/api/v1'

/** Client-side codes for failures that never reach the API's Problem Details. */
export const CLIENT_ERROR_CODES = {
  network: 'NETWORK_ERROR',
  unknown: 'UNKNOWN_ERROR',
} as const

export type ApiErrorParams = Record<string, unknown>

export class ApiError extends Error {
  readonly code: string
  /** HTTP status; 0 when the request never got a response (network failure). */
  readonly status: number
  readonly params: ApiErrorParams
  readonly detail: string | undefined

  constructor(init: {
    code: string
    status: number
    params?: ApiErrorParams
    detail?: string
    cause?: unknown
  }) {
    super(init.detail ?? init.code, { cause: init.cause })
    this.name = 'ApiError'
    this.code = init.code
    this.status = init.status
    this.params = init.params ?? {}
    this.detail = init.detail
  }

  get isClientError(): boolean {
    return this.status >= 400 && this.status < 500
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

export function getApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_URL ?? ''
  return `${raw.replace(/\/+$/, '')}${API_PREFIX}`
}

export function apiUrl(path: string): string {
  return `${getApiBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`
}

/** Name-based check: the AbortError may come from another realm (e.g. Node vs DOM). */
export function isAbortError(error: unknown): boolean {
  return error instanceof Error
    ? error.name === 'AbortError'
    : isRecord(error) && error.name === 'AbortError'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

async function toApiError(response: Response): Promise<ApiError> {
  let body: unknown
  try {
    body = await response.json()
  } catch {
    body = undefined
  }

  if (isRecord(body) && typeof body.code === 'string') {
    return new ApiError({
      code: body.code,
      status: response.status,
      params: isRecord(body.params) ? body.params : {},
      detail: typeof body.detail === 'string' ? body.detail : undefined,
    })
  }

  return new ApiError({ code: CLIENT_ERROR_CODES.unknown, status: response.status })
}

/**
 * Low-level request. Resolves with the Response when it is ok (2xx);
 * otherwise throws ApiError. AbortError is re-thrown untouched so callers can ignore it.
 */
export async function apiRequest(path: string, init: RequestInit = {}): Promise<Response> {
  let response: Response
  try {
    response = await fetch(apiUrl(path), init)
  } catch (error) {
    if (isAbortError(error)) throw error
    throw new ApiError({ code: CLIENT_ERROR_CODES.network, status: 0, cause: error })
  }

  if (!response.ok) throw await toApiError(response)
  return response
}

/** JSON request. A plain object `json` body is serialised with the right header. */
export async function apiFetch<T>(
  path: string,
  { json, headers, ...init }: RequestInit & { json?: unknown } = {},
): Promise<T> {
  const finalHeaders = new Headers(headers)
  finalHeaders.set('Accept', 'application/json')
  if (json !== undefined) finalHeaders.set('Content-Type', 'application/json')

  const response = await apiRequest(path, {
    ...init,
    headers: finalHeaders,
    body: json !== undefined ? JSON.stringify(json) : init.body,
  })
  return (await response.json()) as T
}
