import { QueryClient } from '@tanstack/react-query'
import { isApiError } from '@/lib/api-client'

const MAX_RETRIES = 2

/** 4xx responses (bad input, rate limit…) will not succeed on retry; network and 5xx might. */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (isApiError(error) && error.isClientError) return false
  return failureCount < MAX_RETRIES
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: shouldRetry,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: false,
      },
    },
  })
}
