import {
  CircleAlertIcon,
  CircleCheckIcon,
  FileTextIcon,
  FileXIcon,
  LoaderCircleIcon,
  XIcon,
} from 'lucide-react'
import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { translateFileError } from '@/i18n/messages'
import { useFormatters } from '@/i18n/use-formatters'
import { formatBytes } from '@/lib/bytes'
import { cn } from '@/lib/utils'
import { problemText } from '../lib/problem-text'
import type { SelectedFile } from '../selection-store'

interface SelectedFileListProps {
  items: SelectedFile[]
  formats: string
  onRemove: (item: SelectedFile) => void
  onClear: () => void
  /** Files in the extraction request that is running. */
  inFlightIds?: ReadonlySet<string>
}

export function SelectedFileList({
  items,
  formats,
  onRemove,
  onClear,
  inFlightIds = new Set<string>(),
}: SelectedFileListProps) {
  const { t } = useTranslation()
  const headingId = useId()
  const busy = inFlightIds.size > 0
  const ready = items.filter((item) => item.problem === null && !item.extractionError).length
  const withProblems = items.length - ready

  return (
    <section aria-labelledby={headingId} className="mt-8">
      <div className="flex items-start justify-between gap-4 border-b pb-3">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <h2 id={headingId} className="text-base font-medium">
            {t('upload.list.heading')}
          </h2>
          <p className="text-sm text-muted-foreground tabular-nums">
            {t('upload.list.ready', { count: ready })}
            {withProblems > 0 && (
              <span className="text-destructive">
                {' · '}
                {t('upload.list.problems', { count: withProblems })}
              </span>
            )}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClear}
          disabled={busy}
          className="-mr-2 shrink-0"
        >
          {t('upload.list.clear')}
        </Button>
      </div>

      <ul aria-labelledby={headingId} className="divide-y">
        {items.map((item) => (
          <FileRow
            key={item.id}
            item={item}
            formats={formats}
            reading={inFlightIds.has(item.id)}
            onRemove={() => {
              onRemove(item)
            }}
          />
        ))}
      </ul>
    </section>
  )
}

type RowState = 'ready' | 'skipped' | 'reading' | 'failed'

const STATUS: Record<RowState, { icon: typeof CircleAlertIcon; tone: string; key: string }> = {
  ready: { icon: CircleCheckIcon, tone: 'text-success', key: 'upload.list.statusReady' },
  skipped: { icon: CircleAlertIcon, tone: 'text-destructive', key: 'upload.list.statusSkipped' },
  reading: {
    icon: LoaderCircleIcon,
    tone: 'text-muted-foreground',
    key: 'upload.list.statusReading',
  },
  failed: { icon: CircleAlertIcon, tone: 'text-destructive', key: 'upload.list.statusFailed' },
}

function FileRow({
  item,
  formats,
  reading,
  onRemove,
}: {
  item: SelectedFile
  formats: string
  reading: boolean
  onRemove: () => void
}) {
  const { t } = useTranslation()
  const { locale } = useFormatters()
  const problemId = useId()
  const { file, problem, previewUrl, extractionError } = item

  const state: RowState = problem
    ? 'skipped'
    : reading
      ? 'reading'
      : extractionError
        ? 'failed'
        : 'ready'
  const reason = problem
    ? problemText(t, problem, { formats })
    : extractionError && !reading
      ? translateFileError(t, extractionError)
      : null

  const size = formatBytes(file.size, locale)
  const { icon: StatusIcon, tone, key } = STATUS[state]
  const status = (
    <span className={cn('inline-flex items-center gap-1.5', tone)}>
      <StatusIcon
        aria-hidden="true"
        className={cn('size-3.5 shrink-0', state === 'reading' && 'animate-spin')}
      />
      {t(key)}
    </span>
  )

  return (
    <li
      className="grid animate-in grid-cols-[2.75rem_minmax(0,1fr)_auto] items-center gap-x-3 py-3 duration-200 ease-out fade-in slide-in-from-bottom-1 sm:grid-cols-[2.75rem_minmax(0,1fr)_8.5rem_4.5rem_auto] sm:gap-x-4"
      aria-describedby={reason ? problemId : undefined}
    >
      <Thumbnail
        previewUrl={previewUrl}
        isPdf={file.type === 'application/pdf'}
        broken={state === 'skipped' || state === 'failed'}
      />

      <div className="min-w-0">
        <p className="truncate text-sm font-medium" title={file.name}>
          {file.name}
        </p>
        {/* Mobile: status and size share one line under the name */}
        <p className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground sm:hidden">
          {status}
          <span aria-hidden="true">·</span>
          <span className="tabular-nums">{size}</span>
        </p>
        {reason && (
          <p id={problemId} className="mt-1 text-sm text-destructive">
            {reason}
          </p>
        )}
      </div>

      <p className="hidden text-sm sm:block">{status}</p>

      <p className="hidden text-right text-sm text-muted-foreground tabular-nums sm:block">
        {size}
      </p>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onRemove}
        disabled={reading}
        aria-label={t('upload.list.remove', { name: file.name })}
        className="size-11 text-muted-foreground hover:text-foreground sm:size-9"
      >
        <XIcon aria-hidden="true" />
      </Button>
    </li>
  )
}

function Thumbnail({
  previewUrl,
  isPdf,
  broken,
}: {
  previewUrl: string | null
  isPdf: boolean
  broken: boolean
}) {
  const frame = 'size-11 overflow-hidden rounded-md border bg-card'
  if (previewUrl) {
    return (
      <span className={frame}>
        <img src={previewUrl} alt="" className="size-full object-cover object-top" />
      </span>
    )
  }
  const Icon = broken && !isPdf ? FileXIcon : FileTextIcon
  return (
    <span
      className={cn(
        frame,
        'flex items-center justify-center',
        broken ? 'text-destructive' : 'text-primary',
      )}
    >
      <Icon aria-hidden="true" className="size-5" strokeWidth={1.5} />
    </span>
  )
}
