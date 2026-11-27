import { UploadIcon } from 'lucide-react'
import { useId } from 'react'
import { useDropzone, type FileRejection } from 'react-dropzone'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Candidate } from '../lib/selection'
import { toAcceptMap } from '../lib/selection'
import { PaperToTable } from './PaperToTable'

interface DropZoneProps {
  acceptedMimeTypes: readonly string[]
  /** Helper line with formats and limits. */
  limitsText: string
  onFiles: (candidates: Candidate[]) => void
}

export function DropZone({ acceptedMimeTypes, limitsText, onFiles }: DropZoneProps) {
  const { t } = useTranslation()
  const titleId = useId()
  const hintId = useId()

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    accept: toAcceptMap(acceptedMimeTypes),
    multiple: true,
    // The visible button is the keyboard entry point; the zone itself stays a pointer target.
    noKeyboard: true,
    onDrop: (accepted: File[], rejected: FileRejection[]) => {
      onFiles([
        ...accepted.map((file) => ({ file })),
        ...rejected.map(({ file }) => ({ file, typeRejected: true })),
      ])
    },
  })

  return (
    <section aria-labelledby={titleId}>
      <div
        {...getRootProps({
          'aria-label': t('upload.dropzone.label'),
          role: 'group',
        })}
        data-active={isDragActive || undefined}
        data-reject={isDragReject || undefined}
        className={cn(
          'group/zone relative flex cursor-pointer flex-col items-center rounded-xl border-[1.5px] border-dashed border-zone-border bg-zone px-5 py-10 text-center sm:px-10 sm:py-14',
          'transition-[background-color,border-color] duration-200 ease-out',
          'hover:border-primary/55',
          'data-active:border-primary data-active:bg-accent/60',
          'data-reject:border-destructive data-reject:bg-destructive-surface',
        )}
      >
        <input {...getInputProps({ 'aria-describedby': hintId })} />

        <PaperToTable active={isDragActive && !isDragReject} className="mb-7" />

        <h2
          id={titleId}
          aria-live="polite"
          className="text-xl font-medium tracking-tight text-balance sm:text-2xl"
        >
          {isDragReject ? (
            t('upload.dropzone.reject')
          ) : isDragActive ? (
            t('upload.dropzone.active')
          ) : (
            <>
              <span className="hidden pointer-fine:inline">{t('upload.dropzone.title')}</span>
              <span className="pointer-fine:hidden">{t('upload.dropzone.titleTouch')}</span>
            </>
          )}
        </h2>

        <div className="mt-5 flex items-center gap-3 text-muted-foreground">
          <span aria-hidden="true" className="hidden pointer-fine:inline">
            {t('upload.dropzone.or')}
          </span>
          {/* Clicks bubble to the zone, which opens the file picker. */}
          <Button type="button" size="lg" className="h-11 gap-2 px-5 text-[0.9375rem]">
            <UploadIcon aria-hidden="true" />
            {t('upload.dropzone.select')}
          </Button>
        </div>

        <p
          id={hintId}
          className="mt-6 max-w-[64ch] font-mono text-xs leading-relaxed text-balance text-muted-foreground"
        >
          {limitsText}
        </p>
      </div>
    </section>
  )
}
