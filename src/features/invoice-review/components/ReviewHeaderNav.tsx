import { ArrowLeftIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { useInvoicesStore } from '@/store/invoices'

/** Breadcrumb shown in the app header on /review. */
export function ReviewHeaderNav() {
  const { t } = useTranslation()
  const count = useInvoicesStore((state) => state.invoices.length)

  return (
    <nav aria-label={t('review.nav.label')} className="hidden items-center gap-3 text-sm sm:flex">
      <span aria-hidden="true" className="h-5 w-px bg-border" />
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 rounded-md text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeftIcon aria-hidden="true" className="size-4" />
        {t('review.nav.back')}
      </Link>
      {count > 0 && (
        <>
          <span aria-hidden="true" className="text-muted-foreground/60">
            /
          </span>
          <span aria-current="page" className="font-medium">
            {t('review.nav.count', { count })}
          </span>
        </>
      )}
    </nav>
  )
}
