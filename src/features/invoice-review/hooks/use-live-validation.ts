import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { translateApiError } from '@/i18n/messages'
import { apiFetch, isAbortError } from '@/lib/api-client'
import { normalizeValidation, type Invoice, type ValidateResponse } from '@/lib/api-models'
import { useInvoicesStore } from '@/store/invoices'

/** Quiet time after the last edit before asking the backend to validate. */
export const VALIDATE_DEBOUNCE_MS = 600

/**
 * Revalidates every invoice of the batch with POST /invoices/validate after it is edited:
 * debounced per invoice, and a newer edit aborts the request still running for the same invoice,
 * so a late answer about old numbers never replaces a newer one. The arithmetic is the backend's.
 */
export function useLiveValidation() {
  const { t } = useTranslation()

  useEffect(() => {
    const timers = new Map<string, ReturnType<typeof setTimeout>>()
    const requests = new Map<string, AbortController>()

    const validate = async (id: string, invoice: Invoice) => {
      const controller = new AbortController()
      requests.get(id)?.abort()
      requests.set(id, controller)
      try {
        const response = await apiFetch<ValidateResponse>('/invoices/validate', {
          method: 'POST',
          json: { invoice },
          signal: controller.signal,
        })
        useInvoicesStore
          .getState()
          .setValidation(id, invoice, normalizeValidation(response.validation))
      } catch (error) {
        if (isAbortError(error)) return
        // One toast per kind of failure: typing on while offline should not stack them up.
        toast.error(translateApiError(t, error), { id: 'live-validation' })
      } finally {
        if (requests.get(id) === controller) requests.delete(id)
      }
    }

    const unsubscribe = useInvoicesStore.subscribe((state, previous) => {
      for (const entry of state.invoices) {
        const before = previous.invoices.find((candidate) => candidate.id === entry.id)
        if (!before || before.invoice === entry.invoice) continue
        // Edited: restart its quiet period and drop the answer about the older numbers.
        clearTimeout(timers.get(entry.id))
        requests.get(entry.id)?.abort()
        timers.set(
          entry.id,
          setTimeout(() => {
            timers.delete(entry.id)
            void validate(entry.id, entry.invoice)
          }, VALIDATE_DEBOUNCE_MS),
        )
      }
    })

    return () => {
      unsubscribe()
      timers.forEach(clearTimeout)
      requests.forEach((controller) => {
        controller.abort()
      })
    }
  }, [t])
}
