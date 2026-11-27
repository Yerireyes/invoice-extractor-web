import { useMeta } from '@/lib/meta'
import { DEFAULT_ACCEPTED_MIME_TYPES, DEFAULT_LIMITS } from '../lib/selection'

/**
 * Limits and formats from /meta, falling back to the contract defaults while it loads or fails.
 * `isDemo`: the backend's default provider is `fake` (development), so results are sample data.
 */
export function useUploadRules() {
  const { data } = useMeta()
  return {
    limits: data?.limits ?? DEFAULT_LIMITS,
    acceptedMimeTypes: data?.accepted_mime_types ?? DEFAULT_ACCEPTED_MIME_TYPES,
    isDemo: data?.providers.some((provider) => provider.default && provider.id === 'fake') ?? false,
  }
}
