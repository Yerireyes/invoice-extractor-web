import { useMeta } from '@/lib/meta'
import { DEFAULT_ACCEPTED_MIME_TYPES, DEFAULT_LIMITS } from '../lib/selection'

/** Limits and formats from /meta, falling back to the contract defaults while it loads or fails. */
export function useUploadRules() {
  const { data } = useMeta()
  return {
    limits: data?.limits ?? DEFAULT_LIMITS,
    acceptedMimeTypes: data?.accepted_mime_types ?? DEFAULT_ACCEPTED_MIME_TYPES,
  }
}
