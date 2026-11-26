import { ArrowRightIcon, LoaderCircleIcon, LockIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface UploadAsideProps {
  onTrySamples: () => void
  loadingSamples: boolean
}

/** Below the drop zone: the samples shortcut and the privacy promise. */
export function UploadAside({ onTrySamples, loadingSamples }: UploadAsideProps) {
  const { t } = useTranslation()

  return (
    <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <SampleSheets />
        <p className="text-sm">
          <span className="text-muted-foreground">{t('upload.samples.question')} </span>
          <button
            type="button"
            onClick={onTrySamples}
            disabled={loadingSamples}
            aria-busy={loadingSamples}
            className="group inline-flex min-h-11 items-center gap-1.5 font-medium text-primary underline decoration-primary/40 underline-offset-4 transition-colors hover:decoration-primary disabled:cursor-wait disabled:opacity-70 sm:min-h-0"
          >
            {loadingSamples ? t('upload.samples.loading') : t('upload.samples.action')}
            {loadingSamples ? (
              <LoaderCircleIcon aria-hidden="true" className="size-4 animate-spin" />
            ) : (
              <ArrowRightIcon
                aria-hidden="true"
                className="size-4 transition-transform duration-200 ease-out group-hover:translate-x-0.5"
              />
            )}
          </button>
        </p>
      </div>

      <p className="flex items-start gap-2 text-sm text-muted-foreground sm:max-w-[46ch] lg:max-w-none">
        <LockIcon aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
        <span>{t('upload.privacy')}</span>
      </p>
    </div>
  )
}

/** Two small sheets, echoing the drop zone illustration. Decorative. */
function SampleSheets() {
  return (
    <svg viewBox="0 0 44 32" aria-hidden="true" focusable="false" className="h-8 w-11 shrink-0">
      <rect
        x="4"
        y="3"
        width="20"
        height="26"
        rx="2"
        transform="rotate(-6 14 16)"
        className="fill-card stroke-zone-border"
      />
      <rect x="18" y="4" width="20" height="26" rx="2" className="fill-card stroke-zone-border" />
      <path
        d="M22 10h8M22 14h12M22 18h10"
        className="stroke-muted-foreground/45"
        strokeLinecap="round"
      />
      <path d="M28 24h6" className="stroke-foreground/70" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}
