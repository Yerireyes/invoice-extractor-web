import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useFormatters } from '@/i18n/use-formatters'
import { useUploadRules } from '../hooks/use-upload-rules'
import { formatList } from '../lib/problem-text'
import { loadSampleFiles } from '../lib/samples'
import { fileKey, type Candidate } from '../lib/selection'
import { useSelectionStore } from '../selection-store'
import { DropZone } from './DropZone'
import { SelectedFileList } from './SelectedFileList'
import { UploadAside } from './UploadAside'

export function UploadPage() {
  const { t } = useTranslation()
  const { locale } = useFormatters()
  const rules = useUploadRules()
  const { items, add, remove, clear } = useSelectionStore()
  const [announcement, setAnnouncement] = useState('')
  const [loadingSamples, setLoadingSamples] = useState(false)
  const titleId = useId()

  const formats = formatList(rules.acceptedMimeTypes, locale)
  const limitsText = t('upload.dropzone.limits', {
    formats,
    count: rules.limits.max_files_per_request,
    maxMb: rules.limits.max_file_size_mb,
  })

  function addCandidates(candidates: Candidate[]) {
    if (candidates.length === 0) return
    const count = add(candidates, rules)
    setAnnouncement(t('upload.list.added', { count }))
  }

  async function trySamples() {
    setLoadingSamples(true)
    try {
      const present = new Set(items.map((item) => fileKey(item.file)))
      const files = (await loadSampleFiles()).filter((file) => !present.has(fileKey(file)))
      if (files.length === 0) {
        toast.info(t('upload.samples.alreadyAdded'))
        return
      }
      addCandidates(files.map((file) => ({ file })))
    } catch {
      toast.error(t('upload.samples.error'))
    } finally {
      setLoadingSamples(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-[66rem] px-4 pt-10 pb-16 sm:px-6 sm:pt-16 lg:pt-20">
      <header
        aria-labelledby={titleId}
        className="grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] lg:items-end lg:gap-14"
      >
        <h1
          id={titleId}
          className="font-display text-[clamp(2.75rem,6.4vw,4.5rem)] leading-[1] font-normal tracking-[-0.025em]"
        >
          {/* Two lines on purpose: the break carries the meaning ("photo → Excel" / "no typing"). */}
          <span className="block">{t('upload.titleLine1')}</span>{' '}
          <span className="block">{t('upload.titleLine2')}</span>
        </h1>
        <div className="lg:pb-2">
          <p className="max-w-[44ch] text-lg leading-relaxed text-muted-foreground">
            {t('upload.lead')}
          </p>
          <ol
            aria-label={t('upload.steps.label')}
            className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm"
          >
            {(['upload', 'review', 'download'] as const).map((step, index) => (
              <li key={step} className="flex items-center gap-2">
                {index > 0 && (
                  <span aria-hidden="true" className="text-muted-foreground/60">
                    ·
                  </span>
                )}
                <span className="font-mono text-xs text-primary tabular-nums">{index + 1}</span>
                <span>{t(`upload.steps.${step}`)}</span>
              </li>
            ))}
          </ol>
        </div>
      </header>

      <div className="mt-10 sm:mt-14">
        <DropZone
          acceptedMimeTypes={rules.acceptedMimeTypes}
          limitsText={limitsText}
          onFiles={addCandidates}
        />
        <UploadAside onTrySamples={() => void trySamples()} loadingSamples={loadingSamples} />

        {items.length > 0 && (
          <SelectedFileList
            items={items}
            formats={formats}
            onRemove={(item) => {
              remove(item.id)
              setAnnouncement(t('upload.list.removed', { name: item.file.name }))
            }}
            onClear={() => {
              clear()
              setAnnouncement(t('upload.list.cleared'))
            }}
          />
        )}
      </div>

      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  )
}
