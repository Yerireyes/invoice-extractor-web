import {
  ExternalLinkIcon,
  FileTextIcon,
  ImageIcon,
  MaximizeIcon,
  MinusIcon,
  PlusIcon,
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { BatchInvoice } from '@/store/invoices'

/** Zoom steps relative to "fit to width" (1). */
const ZOOM_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3] as const

export function InvoiceViewer({ entry, className }: { entry: BatchInvoice; className?: string }) {
  const { t } = useTranslation()
  const [zoomIndex, setZoomIndex] = useState(2)
  const zoom = ZOOM_STEPS[zoomIndex] ?? 1
  const isPdf = entry.file.type === 'application/pdf'
  const url = entry.previewUrl

  return (
    <section
      aria-label={t('review.viewer.label')}
      className={cn('flex min-h-0 flex-col', className)}
    >
      <div className="flex items-center justify-between gap-3 border-b px-4 py-2.5">
        <p className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
          {isPdf ? (
            <FileTextIcon aria-hidden="true" className="size-4 shrink-0" />
          ) : (
            <ImageIcon aria-hidden="true" className="size-4 shrink-0" />
          )}
          <span className="truncate" title={entry.fileName}>
            {entry.fileName}
          </span>
        </p>

        {!isPdf && (
          <div className="flex shrink-0 items-center gap-2">
            <div
              role="group"
              aria-label={t('review.viewer.zoom')}
              className="flex items-center rounded-lg border bg-card"
            >
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="rounded-r-none"
                onClick={() => {
                  setZoomIndex((index) => Math.max(0, index - 1))
                }}
                disabled={zoomIndex === 0}
                aria-label={t('review.viewer.zoomOut')}
              >
                <MinusIcon aria-hidden="true" />
              </Button>
              <output
                aria-live="polite"
                className="w-14 border-x text-center font-mono text-xs tabular-nums"
              >
                {Math.round(zoom * 100)} %
              </output>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="rounded-l-none"
                onClick={() => {
                  setZoomIndex((index) => Math.min(ZOOM_STEPS.length - 1, index + 1))
                }}
                disabled={zoomIndex === ZOOM_STEPS.length - 1}
                aria-label={t('review.viewer.zoomIn')}
              >
                <PlusIcon aria-hidden="true" />
              </Button>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setZoomIndex(2)
              }}
              className="h-8 gap-1.5 bg-card"
            >
              <MaximizeIcon aria-hidden="true" />
              {t('review.viewer.fit')}
            </Button>
          </div>
        )}
      </div>

      <div className="relative min-h-0 flex-1 overflow-auto bg-muted/60 p-4 sm:p-6">
        {!url ? null : isPdf ? (
          <object
            data={url}
            type="application/pdf"
            title={t('review.viewer.pdfTitle', { name: entry.fileName })}
            className="h-full min-h-[70vh] w-full rounded-md border bg-card"
          >
            <div className="flex flex-col items-center gap-3 p-8 text-center text-sm text-muted-foreground">
              <p>{t('review.viewer.pdfFallback')}</p>
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 font-medium text-primary underline underline-offset-4"
              >
                {t('review.viewer.openPdf')}
                <ExternalLinkIcon aria-hidden="true" className="size-4" />
              </a>
            </div>
          </object>
        ) : (
          <img
            src={url}
            alt={t('review.viewer.imageAlt', { name: entry.fileName })}
            style={{ width: `${String(zoom * 100)}%` }}
            className="mx-auto block h-auto max-w-none rounded-sm border bg-card transition-[width] duration-200 ease-out"
          />
        )}
      </div>
    </section>
  )
}
