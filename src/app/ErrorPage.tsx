import { RotateCcwIcon } from 'lucide-react'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouteError } from 'react-router'
import { Button } from '@/components/ui/button'

/**
 * Last resort for errors while rendering a route (or loading its code after a deploy): a calm
 * explanation and a reload, instead of React Router's developer screen. Outside the layout on
 * purpose, since the layout itself may be what failed.
 */
export function ErrorPage() {
  const { t } = useTranslation()
  const error = useRouteError()

  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4 text-foreground">
      <div className="flex max-w-md flex-col items-center text-center">
        <h1 className="font-display text-[2rem] leading-tight tracking-[-0.015em] text-balance">
          {t('errorPage.title')}
        </h1>
        <p className="mt-3 text-pretty text-muted-foreground">{t('errorPage.body')}</p>
        <Button
          type="button"
          size="lg"
          onClick={() => {
            window.location.reload()
          }}
          className="mt-8 h-11 gap-2 px-5"
        >
          <RotateCcwIcon aria-hidden="true" />
          {t('errorPage.reload')}
        </Button>
      </div>
    </main>
  )
}
