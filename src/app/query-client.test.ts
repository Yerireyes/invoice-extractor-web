import { ApiError } from '@/lib/api-client'
import { createQueryClient, shouldRetry } from './query-client'

describe('shouldRetry', () => {
  it('never retries 4xx API errors', () => {
    expect(shouldRetry(0, new ApiError({ code: 'VALIDATION_ERROR', status: 422 }))).toBe(false)
    expect(shouldRetry(0, new ApiError({ code: 'RATE_LIMITED', status: 429 }))).toBe(false)
  })

  it('retries 5xx and network errors up to two times', () => {
    const serverError = new ApiError({ code: 'LLM_UNAVAILABLE', status: 503 })
    const networkError = new ApiError({ code: 'NETWORK_ERROR', status: 0 })
    expect(shouldRetry(0, serverError)).toBe(true)
    expect(shouldRetry(1, networkError)).toBe(true)
    expect(shouldRetry(2, serverError)).toBe(false)
  })

  it('retries unknown errors with the same limit', () => {
    expect(shouldRetry(0, new Error('boom'))).toBe(true)
  })
})

describe('createQueryClient', () => {
  it('disables retries for mutations', () => {
    expect(createQueryClient().getDefaultOptions().mutations?.retry).toBe(false)
  })
})
