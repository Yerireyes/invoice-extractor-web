import { useMutation } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { isAbortError, isApiError } from '@/lib/api-client'
import {
  normalizeInvoice,
  normalizeValidation,
  type ExtractResponse,
  type FileError,
} from '@/lib/api-models'
import { useInvoicesStore, type BatchInvoice } from '@/store/invoices'
import { extractInvoices } from '../api'
import { useSelectionStore, type SelectedFile } from '../selection-store'

/**
 * Honest stages of a single /extract request: the browser can measure the upload, but the AI
 * reading happens server-side in one go, so that stage is indeterminate.
 */
export type ExtractionPhase =
  | { kind: 'idle' }
  | { kind: 'sending'; startedAt: number }
  | { kind: 'uploading'; startedAt: number; loaded: number; total: number }
  | { kind: 'reading'; startedAt: number; count: number }

export interface ExtractionOutcome {
  succeeded: number
  failed: number
}

interface ExtractionVariables {
  items: SelectedFile[]
}

/** Splits /extract results (same order as the files sent) into batch invoices and file errors. */
export function pairResults(
  items: readonly SelectedFile[],
  response: ExtractResponse,
): { invoices: BatchInvoice[]; errors: Map<string, FileError> } {
  const invoices: BatchInvoice[] = []
  const errors = new Map<string, FileError>()

  items.forEach((item, index) => {
    const result = response.results[index]
    if (!result) {
      errors.set(item.id, { code: 'EXTRACTION_FAILED', params: {} })
      return
    }
    if (result.status === 'error') {
      errors.set(item.id, result.error)
      return
    }
    invoices.push({
      id: item.id,
      fileName: item.file.name,
      file: item.file,
      previewUrl: item.previewUrl,
      invoice: normalizeInvoice(result.invoice),
      validation: normalizeValidation(result.validation),
      fieldConfidence: result.field_confidence ?? {},
      meta: result.meta,
    })
  })

  return { invoices, errors }
}

export function useExtraction({
  onComplete,
}: {
  /** Called after results are stored; `failed === 0` means every file was read. */
  onComplete?: (outcome: ExtractionOutcome) => void
} = {}) {
  const [phase, setPhase] = useState<ExtractionPhase>({ kind: 'idle' })
  const [retryAt, setRetryAt] = useState<number | null>(null)
  const controller = useRef<AbortController | null>(null)

  // Never leave a request running after the page is gone.
  useEffect(
    () => () => {
      controller.current?.abort()
    },
    [],
  )

  const mutation = useMutation({
    mutationFn: ({ items }: ExtractionVariables) => {
      controller.current?.abort()
      controller.current = new AbortController()
      const startedAt = Date.now()
      setRetryAt(null)
      setPhase({ kind: 'sending', startedAt })

      return extractInvoices(
        items.map((item) => item.file),
        {
          signal: controller.current.signal,
          onUploadProgress: ({ loaded, total }) => {
            setPhase(
              loaded >= total
                ? { kind: 'reading', startedAt, count: items.length }
                : { kind: 'uploading', startedAt, loaded, total },
            )
          },
          onUploadDone: () => {
            setPhase({ kind: 'reading', startedAt, count: items.length })
          },
        },
      )
    },
    onSuccess: (response, { items }) => {
      const { invoices, errors } = pairResults(items, response)
      useSelectionStore.getState().setExtractionErrors(errors)
      useInvoicesStore.getState().add(invoices)
      useSelectionStore.getState().take(invoices.map((invoice) => invoice.id))
      onComplete?.({ succeeded: invoices.length, failed: errors.size })
    },
    onError: (error) => {
      if (isApiError(error) && error.code === 'RATE_LIMITED') {
        const seconds = error.params.retry_after_s
        if (typeof seconds === 'number' && seconds > 0) setRetryAt(Date.now() + seconds * 1000)
      }
    },
    onSettled: () => {
      setPhase({ kind: 'idle' })
    },
  })

  const error = mutation.error && !isAbortError(mutation.error) ? mutation.error : null

  return {
    phase,
    isBusy: mutation.isPending,
    /** Ids of the files in the request that is running. */
    inFlightIds: new Set(mutation.isPending ? mutation.variables.items.map((item) => item.id) : []),
    error,
    /** Epoch ms when a rate-limited request may be retried, if the API said so. */
    retryAt,
    extract: (items: SelectedFile[]) => {
      if (items.length > 0) mutation.mutate({ items })
    },
  }
}

/** Current time, refreshed once per second while `active`. */
function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!active) return
    const tick = () => {
      setNow(Date.now())
    }
    const first = setTimeout(tick, 0)
    const timer = setInterval(tick, 1000)
    return () => {
      clearTimeout(first)
      clearInterval(timer)
    }
  }, [active])

  return now
}

/** Seconds left until `deadline`; 0 when there is none or it has passed. */
export function useCountdown(deadline: number | null): number {
  const now = useNow(deadline !== null)
  return deadline === null ? 0 : Math.max(0, Math.ceil((deadline - now) / 1000))
}

/** Whole seconds since `startedAt` (0 when not running). */
export function useElapsedSeconds(startedAt: number | null): number {
  const now = useNow(startedAt !== null)
  return startedAt === null ? 0 : Math.max(0, Math.floor((now - startedAt) / 1000))
}
