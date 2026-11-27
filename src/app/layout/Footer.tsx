import { CodeXmlIcon, LockIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

export const REPOSITORY_URL = 'https://github.com/Yerireyes/invoice-extractor-web'

/** Privacy promise, source code and version: quiet caption text under a hairline. */
export function Footer({ className }: { className?: string }) {
  const { t } = useTranslation()

  return (
    <footer className={cn('border-t', className)}>
      <div className="mx-auto flex max-w-[66rem] flex-col gap-3 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="flex items-start gap-1.5 text-pretty">
          <LockIcon aria-hidden="true" className="mt-px size-3.5 shrink-0" />
          {t('footer.privacy')}
        </p>
        <div className="flex items-center gap-4">
          <a
            href={REPOSITORY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-9 items-center gap-1.5 rounded-md underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            <CodeXmlIcon aria-hidden="true" className="size-3.5" />
            {t('footer.source')}
            <span className="sr-only"> {t('footer.newTab')}</span>
          </a>
          <span className="font-mono tabular-nums">
            <span className="sr-only">{t('footer.version')} </span>v{__APP_VERSION__}
          </span>
        </div>
      </div>
    </footer>
  )
}
