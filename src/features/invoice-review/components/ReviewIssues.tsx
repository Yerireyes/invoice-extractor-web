import {
  ArrowDownIcon,
  CircleAlertIcon,
  CircleCheckIcon,
  InfoIcon,
  TriangleAlertIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { useFormatters } from '@/i18n/use-formatters'
import { fieldLabel, translateIssue } from '@/i18n/messages'
import type { Issue, IssueSeverity } from '@/lib/api-models'
import { cn } from '@/lib/utils'
import { reviewItems, type BatchInvoice } from '@/store/invoices'
import { hasFormField } from '../schema'

const ORDER: Record<IssueSeverity, number> = { error: 0, warning: 1, info: 2 }

const TONE: Record<IssueSeverity, { icon: typeof CircleAlertIcon; text: string; row: string }> = {
  error: { icon: CircleAlertIcon, text: 'text-destructive', row: 'bg-destructive-surface' },
  warning: { icon: TriangleAlertIcon, text: 'text-warning', row: '' },
  info: { icon: InfoIcon, text: 'text-muted-foreground', row: '' },
}

interface ReviewIssuesProps {
  entry: BatchInvoice
  /** Moves focus to the form field with this contract path. */
  onGoTo: (field: string) => void
}

/**
 * "Por revisar": the issues of the last validation plus the AI's unchecked doubts, errors first,
 * each with its translated explanation, the field it is about and a way to jump to it. The
 * summary line is a live region, so screen readers hear when the numbers start or stop adding up.
 */
export function ReviewIssues({ entry, onGoTo }: ReviewIssuesProps) {
  const { t } = useTranslation()
  const { locale } = useFormatters()
  const { issues, doubts } = reviewItems(entry)
  const currency = entry.invoice.currency ?? ''

  const items: Issue[] = [
    ...issues,
    ...doubts.map((doubt): Issue => ({
      code: 'LOW_CONFIDENCE',
      severity: 'warning',
      field: doubt.field,
      params: { confidence: doubt.confidence },
    })),
  ].sort((a, b) => ORDER[a.severity] - ORDER[b.severity])

  const count = (severity: IssueSeverity) =>
    items.filter((item) => item.severity === severity).length
  const summary = (['error', 'warning', 'info'] as const)
    .filter((severity) => count(severity) > 0)
    .map((severity) => ({
      severity,
      text: t(`review.issues.count.${severity}`, { count: count(severity) }),
    }))

  return (
    <section aria-labelledby={`issues-${entry.id}`} className="border-b px-5 py-6 sm:px-7">
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <h3 id={`issues-${entry.id}`} className="text-sm font-semibold">
          {t('review.issues.title')}
        </h3>
        <p aria-live="polite" className="text-xs tabular-nums">
          {summary.length === 0 ? (
            <span className="sr-only">{t('review.issues.noneShort')}</span>
          ) : (
            summary.map((part, index) => (
              <span key={part.severity}>
                {index > 0 && <span className="text-muted-foreground"> · </span>}
                <span className={TONE[part.severity].text}>{part.text}</span>
              </span>
            ))
          )}
        </p>
      </div>

      {items.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <CircleCheckIcon aria-hidden="true" className="size-4 shrink-0 text-success" />
          {t('review.issues.none')}
        </p>
      ) : (
        <ul className="divide-y overflow-hidden rounded-lg border bg-card">
          {items.map((issue, index) => {
            const tone = TONE[issue.severity]
            const Icon = tone.icon
            const field = issue.field
            return (
              <li
                key={`${issue.code}-${field ?? ''}-${String(index)}`}
                className={cn('flex gap-3 px-4 py-3.5', tone.row)}
              >
                <Icon aria-hidden="true" className={cn('mt-0.5 size-4 shrink-0', tone.text)} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-pretty">
                    <span className="sr-only">{t(`severity.${issue.severity}`)}: </span>
                    {translateIssue(t, issue, { currency, locale })}
                  </p>
                  {field && (
                    <p className="mt-1 text-xs text-muted-foreground">{fieldLabel(t, field)}</p>
                  )}
                </div>
                {field && hasFormField(entry.invoice, field) && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      onGoTo(field)
                    }}
                    aria-label={t('review.issues.goToLabel', { field: fieldLabel(t, field) })}
                    className={cn(
                      '-my-1 h-11 shrink-0 gap-1 self-start px-2 pointer-fine:h-8',
                      tone.text,
                      'hover:bg-transparent hover:underline',
                    )}
                  >
                    {t('review.issues.goTo')}
                    <ArrowDownIcon aria-hidden="true" />
                  </Button>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
