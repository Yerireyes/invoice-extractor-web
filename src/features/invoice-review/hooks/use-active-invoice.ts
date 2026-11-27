import { useSearchParams } from 'react-router'
import { useInvoicesStore, type BatchInvoice } from '@/store/invoices'

/**
 * The invoice being reviewed lives in the URL (?id=…) so back/forward and reloads within the
 * session keep it; an unknown or missing id falls back to the first invoice of the batch.
 */
export function useActiveInvoice() {
  const invoices = useInvoicesStore((state) => state.invoices)
  const [params, setParams] = useSearchParams()
  const requested = params.get('id')
  const index = Math.max(
    0,
    invoices.findIndex((invoice) => invoice.id === requested),
  )
  const active: BatchInvoice | undefined = invoices[index]

  const select = (id: string) => {
    setParams({ id }, { replace: true })
  }
  const neighbour = (offset: number) => invoices[index + offset]

  return {
    invoices,
    active,
    index,
    select,
    previous: neighbour(-1),
    next: neighbour(1),
  }
}
