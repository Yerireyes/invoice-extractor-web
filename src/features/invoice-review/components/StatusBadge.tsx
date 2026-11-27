import { useTranslation } from 'react-i18next'
import type { ValidationStatus } from '@/lib/api-models'
import { cn } from '@/lib/utils'

const TONE: Record<ValidationStatus, string> = {
  valid: 'border-primary/25 bg-accent text-accent-foreground',
  warnings: 'border-warning/35 bg-warning-surface text-warning',
  invalid: 'border-destructive/30 bg-destructive-surface text-destructive',
}

const DOT: Record<ValidationStatus, string> = {
  valid: 'bg-success',
  warnings: 'bg-warning',
  invalid: 'bg-destructive',
}

/** Validation state as text plus colour (never colour alone). */
export function StatusBadge({
  status,
  className,
}: {
  status: ValidationStatus
  className?: string
}) {
  const { t } = useTranslation()
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        TONE[status],
        className,
      )}
    >
      <span aria-hidden="true" className={cn('size-1.5 rounded-full', DOT[status])} />
      {t(`validationStatus.${status}`)}
    </span>
  )
}
