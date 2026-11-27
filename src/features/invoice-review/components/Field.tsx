import { CheckIcon, CircleAlertIcon, TriangleAlertIcon } from 'lucide-react'
import { cloneElement, useId, type ReactElement } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useFormatters } from '@/i18n/use-formatters'
import { cn } from '@/lib/utils'

interface ControlProps {
  id?: string
  'aria-describedby'?: string
  'aria-invalid'?: boolean
  className?: string
}

interface FieldProps {
  label: string
  /** Optional qualifier next to the label (e.g. the tax ID type). */
  hint?: string
  /** i18n key of a schema error, if any. */
  error?: string
  /** AI confidence 0..1 when the field still needs checking; omitted otherwise. */
  lowConfidence?: number
  onConfirm?: () => void
  className?: string
  children: ReactElement<ControlProps>
}

/**
 * Label + control + messages. Wires id, aria-describedby and aria-invalid into the control so
 * every field is labelled and its problems are announced with it.
 */
export function Field({
  label,
  hint,
  error,
  lowConfidence,
  onConfirm,
  className,
  children,
}: FieldProps) {
  const { t } = useTranslation()
  const { percent } = useFormatters()
  const id = useId()
  const errorId = `${id}-error`
  const confidenceId = `${id}-confidence`
  const unsure = lowConfidence !== undefined

  const describedBy = [error ? errorId : null, unsure ? confidenceId : null]
    .filter(Boolean)
    .join(' ')

  const control = cloneElement(children, {
    id,
    'aria-describedby': describedBy || undefined,
    'aria-invalid': error ? true : undefined,
    className: cn(
      children.props.className,
      unsure && !error && 'border-warning/70 bg-warning-surface dark:bg-warning-surface',
    ),
  })

  return (
    <div className={cn('min-w-0', className)}>
      <Label
        htmlFor={id}
        className={cn(
          'mb-1.5 text-[0.8125rem] font-normal text-muted-foreground',
          unsure && 'text-warning',
        )}
      >
        {label}
        {hint && <span className="text-muted-foreground/80"> · {hint}</span>}
      </Label>

      {/* Stable structure: only the button comes and goes, so the control is never remounted. */}
      <div className="flex gap-2">
        <div className="min-w-0 flex-1">{control}</div>
        {unsure && onConfirm && (
          <Button
            type="button"
            variant="outline"
            onClick={onConfirm}
            aria-label={t('review.confidence.confirmLabel', { field: label })}
            className="h-10 shrink-0 gap-1.5 bg-card"
          >
            <CheckIcon aria-hidden="true" />
            {t('review.confidence.confirm')}
          </Button>
        )}
      </div>

      {unsure && (
        <p id={confidenceId} className="mt-1.5 flex items-start gap-1.5 text-xs text-warning">
          <TriangleAlertIcon aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
          {t('review.confidence.hint', { percent: percent(lowConfidence, { ratio: true }) })}
        </p>
      )}
      {error && (
        <p id={errorId} className="mt-1.5 flex items-start gap-1.5 text-xs text-destructive">
          <CircleAlertIcon aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
          {t(error)}
        </p>
      )}
    </div>
  )
}
