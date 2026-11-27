import { LockIcon, PlusIcon } from 'lucide-react'
import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { useFormatters } from '@/i18n/use-formatters'
import type { ValidationStatus } from '@/lib/api-models'
import { cn } from '@/lib/utils'
import { reviewStatus, type BatchInvoice } from '@/store/invoices'
import { issuerLabel } from '../lib/labels'
import { StatusBadge } from '@/components/status-badge'

const SUMMARY_TONE: Record<ValidationStatus, string> = {
  valid: 'text-success',
  warnings: 'text-warning',
  invalid: 'text-destructive',
}

export function BatchList({
  invoices,
  activeId,
  onSelect,
}: {
  invoices: BatchInvoice[]
  activeId: string | undefined
  onSelect: (id: string) => void
}) {
  const { t } = useTranslation()
  const { money } = useFormatters()
  const headingId = useId()

  const counts = invoices.reduce<Record<ValidationStatus, number>>(
    (acc, entry) => ({ ...acc, [reviewStatus(entry)]: acc[reviewStatus(entry)] + 1 }),
    { valid: 0, warnings: 0, invalid: 0 },
  )
  const summary = (['valid', 'warnings', 'invalid'] as const).filter((status) => counts[status] > 0)

  return (
    <nav aria-labelledby={headingId} className="flex h-full flex-col">
      <div className="px-4 pt-5 pb-3">
        <div className="flex items-baseline justify-between gap-2">
          <h2 id={headingId} className="text-sm font-semibold">
            {t('review.batch.heading')}
          </h2>
          <Link
            to="/"
            className="inline-flex items-center gap-1 rounded-md text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <PlusIcon aria-hidden="true" className="size-3.5" />
            {t('review.batch.add')}
          </Link>
        </div>
        <p className="mt-1 text-xs">
          {summary.map((status, index) => (
            <span key={status}>
              {index > 0 && <span className="text-muted-foreground"> · </span>}
              <span className={SUMMARY_TONE[status]}>
                {t(`review.batch.${status}`, { count: counts[status] })}
              </span>
            </span>
          ))}
        </p>
      </div>

      <ul
        aria-label={t('review.batch.listLabel')}
        className="flex-1 space-y-1 overflow-y-auto px-2"
      >
        {invoices.map((entry) => {
          const active = entry.id === activeId
          const { invoice } = entry
          return (
            <li key={entry.id}>
              <button
                type="button"
                onClick={() => {
                  onSelect(entry.id)
                }}
                aria-current={active ? 'true' : undefined}
                className={cn(
                  'w-full rounded-lg border px-3 py-3 text-left transition-colors',
                  active
                    ? 'border-border bg-card'
                    : 'border-transparent hover:bg-card/60 focus-visible:bg-card/60',
                )}
              >
                <span className="flex items-start justify-between gap-3">
                  <span className="line-clamp-2 min-w-0 text-sm font-medium break-words">
                    {issuerLabel(t, entry)}
                  </span>
                  <span className="shrink-0 text-sm tabular-nums">
                    {invoice.total && invoice.currency
                      ? money(invoice.total, invoice.currency, { currencyDisplay: 'narrowSymbol' })
                      : t('review.batch.noTotal')}
                  </span>
                </span>
                <span className="mt-0.5 flex items-baseline justify-between gap-3 text-xs text-muted-foreground">
                  <span className="min-w-0 truncate font-mono">
                    {invoice.invoice_number ?? entry.fileName}
                  </span>
                  <span className="shrink-0 font-mono">{invoice.currency}</span>
                </span>
                <StatusBadge status={reviewStatus(entry)} className="mt-2" />
              </button>
            </li>
          )
        })}
      </ul>

      <p className="flex items-start gap-2 border-t px-4 py-4 text-xs text-muted-foreground">
        <LockIcon aria-hidden="true" className="mt-0.5 size-3 shrink-0" />
        {t('review.batch.privacy')}
      </p>
    </nav>
  )
}
