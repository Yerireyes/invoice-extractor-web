import { ArrowRightIcon, ChevronDownIcon, ChevronUpIcon } from 'lucide-react'
import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { useFormatters } from '@/i18n/use-formatters'
import { cn } from '@/lib/utils'
import type { BatchInvoice } from '@/store/invoices'
import { issuerLabel } from '../lib/labels'
import { InvoiceForm } from './InvoiceForm'
import { ReviewIssues } from './ReviewIssues'
import { StatusBadge } from '@/components/status-badge'
import { reviewStatus } from '@/store/invoices'

interface InvoicePanelProps {
  entry: BatchInvoice
  index: number
  total: number
  onPrevious?: () => void
  onNext?: () => void
  /** Position and prev/next in the header; off on mobile, where the picker already has them. */
  showNavigation?: boolean
  className?: string
}

export function InvoicePanel({
  entry,
  index,
  total,
  onPrevious,
  onNext,
  showNavigation = true,
  className,
}: InvoicePanelProps) {
  const { t } = useTranslation()
  const { date } = useFormatters()
  const { invoice } = entry
  const scrollRef = useRef<HTMLDivElement>(null)

  /** "Ir al campo": brings the field into view and focuses it (inputs are named by path). */
  const goTo = (field: string) => {
    const target = scrollRef.current?.querySelector<HTMLElement>(`[name="${field}"]`)
    if (!target) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    target.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' })
    target.focus({ preventScroll: true })
  }

  return (
    <section
      aria-labelledby={`invoice-${entry.id}`}
      className={cn('flex min-h-0 flex-col', className)}
    >
      <header className="border-b px-5 pt-6 pb-5 sm:px-7">
        <div className="flex items-start justify-between gap-4">
          <h2
            id={`invoice-${entry.id}`}
            className="min-w-0 font-display text-[1.75rem] leading-tight font-normal tracking-[-0.015em] text-balance"
          >
            {issuerLabel(t, entry)}
          </h2>
          {showNavigation && (
            <div className="flex shrink-0 items-center gap-1">
              <span className="mr-1 text-xs text-muted-foreground tabular-nums">
                {t('review.panel.position', { current: index + 1, total })}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onPrevious}
                disabled={!onPrevious}
                aria-label={t('review.panel.previous')}
              >
                <ChevronUpIcon aria-hidden="true" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onNext}
                disabled={!onNext}
                aria-label={t('review.panel.next')}
              >
                <ChevronDownIcon aria-hidden="true" />
              </Button>
            </div>
          )}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-muted-foreground">
          <StatusBadge status={reviewStatus(entry)} />
          <span>
            {t(`documentType.${invoice.document_type}`)}
            {invoice.invoice_number && (
              <>
                {' · '}
                {t('review.panel.numberLabel')}{' '}
                <span className="font-mono">{invoice.invoice_number}</span>
              </>
            )}
            {invoice.issue_date && ` · ${date(invoice.issue_date)}`}
          </span>
        </div>
      </header>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        <ReviewIssues entry={entry} onGoTo={goTo} />
        <InvoiceForm key={entry.id} entry={entry} />

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t px-5 py-4 sm:px-7">
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-success" />
            {t('review.panel.saved')}
          </p>
          {onNext && (
            <Button type="button" variant="outline" onClick={onNext} className="h-10 gap-2 bg-card">
              {t('review.panel.nextCta')}
              <ArrowRightIcon aria-hidden="true" />
            </Button>
          )}
        </footer>
      </div>
    </section>
  )
}
