import { useTranslation } from 'react-i18next'

/** While a lazy route's code arrives: a quiet skeleton plus a status for screen readers. */
export function RouteLoading() {
  const { t } = useTranslation()

  return (
    <div role="status" className="mx-auto max-w-[66rem] px-4 py-10 sm:px-6">
      <span className="sr-only">{t('app.loading')}</span>
      <div aria-hidden="true" className="animate-pulse space-y-4 motion-reduce:animate-none">
        <div className="h-8 w-2/5 rounded-md bg-muted" />
        <div className="h-4 w-3/5 rounded-md bg-muted" />
        <div className="h-64 rounded-lg bg-muted" />
      </div>
    </div>
  )
}
