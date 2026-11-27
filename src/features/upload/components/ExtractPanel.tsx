import {
  ArrowRightIcon,
  CircleAlertIcon,
  ClockIcon,
  InfoIcon,
  LoaderCircleIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { useFormatters } from '@/i18n/use-formatters'
import { translateApiError } from '@/i18n/messages'
import { isApiError } from '@/lib/api-client'
import { formatBytes } from '@/lib/bytes'
import { cn } from '@/lib/utils'
import { useCountdown, useElapsedSeconds, type ExtractionPhase } from '../hooks/use-extraction'

interface ExtractPanelProps {
  phase: ExtractionPhase
  /** Files that would be sent now. */
  sendableCount: number
  /** Every sendable file already failed once: the action reads as a retry. */
  isRetry: boolean
  /** Invoices already in the batch, ready for /review. */
  batchCount: number
  error: unknown
  retryAt: number | null
  isDemo: boolean
  onExtract: () => void
}

export function ExtractPanel({
  phase,
  sendableCount,
  isRetry,
  batchCount,
  error,
  retryAt,
  isDemo,
  onExtract,
}: ExtractPanelProps) {
  const { t } = useTranslation()
  const waitSeconds = useCountdown(retryAt)
  const busy = phase.kind !== 'idle'
  const rateLimited = isApiError(error) && error.code === 'RATE_LIMITED'
  const blocked = rateLimited && waitSeconds > 0

  return (
    <div className="mt-6 space-y-4">
      {busy && <ExtractionProgress phase={phase} />}

      {!busy && error !== null && (
        <div
          role="alert"
          className={cn(
            'flex items-start gap-3 rounded-lg border px-4 py-3 text-sm',
            rateLimited
              ? 'border-warning/40 bg-warning-surface text-foreground'
              : 'border-destructive/40 bg-destructive-surface text-foreground',
          )}
        >
          {rateLimited ? (
            <ClockIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-warning" />
          ) : (
            <CircleAlertIcon
              aria-hidden="true"
              className="mt-0.5 size-4 shrink-0 text-destructive"
            />
          )}
          <div>
            <p>{translateApiError(t, error)}</p>
            {rateLimited && retryAt !== null && (
              <p className="mt-1 text-muted-foreground tabular-nums">
                {blocked
                  ? t('upload.extract.retryIn', { count: waitSeconds })
                  : t('upload.extract.retryNow')}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        {batchCount > 0 && !busy && (
          <p className="text-sm text-muted-foreground sm:mr-auto">
            {t('upload.extract.readySummary', { count: batchCount })}
          </p>
        )}
        {batchCount > 0 && !busy && (
          <Button
            asChild
            variant={sendableCount > 0 ? 'outline' : 'default'}
            size="lg"
            className="order-last h-11 gap-2 px-5 sm:order-none"
          >
            <Link to="/review">
              {t('upload.extract.review', { count: batchCount })}
              <ArrowRightIcon aria-hidden="true" />
            </Link>
          </Button>
        )}
        {sendableCount > 0 && (
          <Button
            type="button"
            size="lg"
            onClick={onExtract}
            disabled={busy || blocked}
            aria-disabled={busy || blocked}
            className="h-11 gap-2 px-5 text-[0.9375rem]"
          >
            {busy && <LoaderCircleIcon aria-hidden="true" className="animate-spin" />}
            {isRetry
              ? t('upload.extract.retry', { count: sendableCount })
              : t('upload.extract.action', { count: sendableCount })}
          </Button>
        )}
      </div>

      {isDemo && (
        <p className="flex items-start gap-2 text-sm text-muted-foreground sm:justify-end">
          <InfoIcon aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
          {t('upload.extract.demo')}
        </p>
      )}
    </div>
  )
}

function ExtractionProgress({ phase }: { phase: Exclude<ExtractionPhase, { kind: 'idle' }> }) {
  const { t } = useTranslation()
  const { locale } = useFormatters()
  const elapsed = useElapsedSeconds(phase.startedAt)

  const label =
    phase.kind === 'uploading'
      ? t('upload.extract.uploading', {
          loaded: formatBytes(phase.loaded, locale),
          total: formatBytes(phase.total, locale),
        })
      : phase.kind === 'reading'
        ? t('upload.extract.reading', { count: phase.count })
        : t('upload.extract.sending')
  const percent =
    phase.kind === 'uploading' ? Math.round((phase.loaded / Math.max(phase.total, 1)) * 100) : null

  return (
    <div className="rounded-lg border bg-card px-4 py-3">
      <div className="flex items-baseline justify-between gap-4">
        {/* Only stage changes are announced; the ticking timer stays out of the live region. */}
        <p role="status" className="text-sm font-medium">
          {label}
        </p>
        <p aria-hidden="true" className="font-mono text-xs text-muted-foreground tabular-nums">
          {percent !== null
            ? `${String(percent)} %`
            : t('upload.extract.elapsed', { seconds: elapsed })}
        </p>
      </div>
      <div
        role="progressbar"
        aria-label={t('upload.extract.progressLabel')}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent ?? undefined}
        aria-valuetext={label}
        className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted"
      >
        {percent !== null ? (
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
            style={{ width: `${String(percent)}%` }}
          />
        ) : (
          <div className="h-full w-1/3 rounded-full bg-primary motion-safe:animate-[progress-indeterminate_1.4s_cubic-bezier(0.65,0,0.35,1)_infinite] motion-reduce:w-full motion-reduce:opacity-40" />
        )}
      </div>
      {phase.kind === 'reading' && (
        <p className="mt-2 text-xs text-muted-foreground">{t('upload.extract.readingHint')}</p>
      )}
    </div>
  )
}
