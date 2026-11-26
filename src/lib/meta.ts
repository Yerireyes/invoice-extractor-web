import { queryOptions, useQuery } from '@tanstack/react-query'
import { apiFetch } from './api-client'
import type { MetaResponse } from './api-models'

export function getMeta(signal?: AbortSignal): Promise<MetaResponse> {
  return apiFetch<MetaResponse>('/meta', { signal })
}

/** Limits and formats barely change during a session: fetch once and keep them. */
export const metaQueryOptions = queryOptions({
  queryKey: ['meta'],
  queryFn: ({ signal }) => getMeta(signal),
  staleTime: Infinity,
  gcTime: Infinity,
})

export function useMeta() {
  return useQuery(metaQueryOptions)
}
