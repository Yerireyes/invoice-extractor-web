import { ArrowLeftIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router'
import { Button } from '@/components/ui/button'

/** Any unknown path: says so plainly and leads back to the start. */
export function NotFoundPage() {
  const { t } = useTranslation()
  const { pathname } = useLocation()

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
      <h1 className="font-display text-[2rem] leading-tight tracking-[-0.015em] text-balance">
        {t('notFound.title')}
      </h1>
      <p className="mt-3 text-pretty text-muted-foreground">
        {t('notFound.body', { path: pathname })}
      </p>
      <Button asChild size="lg" className="mt-8 h-11 gap-2 px-5">
        <Link to="/">
          <ArrowLeftIcon aria-hidden="true" />
          {t('notFound.action')}
        </Link>
      </Button>
    </div>
  )
}
