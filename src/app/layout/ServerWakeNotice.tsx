import { LoaderCircleIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMeta } from '@/lib/meta'

/** How long the first answer may take before we explain the wait. */
export const WAKE_NOTICE_AFTER_MS = 5000

/**
 * The backend runs on a free Space that sleeps when idle, so the first request of a visit can take
 * up to a minute. /meta is that first request: if it is still pending after a few seconds, say why
 * under the header, and remove the notice as soon as the server answers (or fails).
 */
export function ServerWakeNotice() {
  const { t } = useTranslation()
  const { isPending } = useMeta()
  const [slow, setSlow] = useState(false)

  useEffect(() => {
    if (!isPending) return
    const timer = setTimeout(() => {
      setSlow(true)
    }, WAKE_NOTICE_AFTER_MS)
    return () => {
      clearTimeout(timer)
    }
  }, [isPending])

  return (
    <div role="status" aria-live="polite">
      {slow && isPending && (
        <div className="border-b bg-muted/60">
          <p className="mx-auto flex max-w-[66rem] items-start gap-2 px-4 py-2.5 text-sm text-pretty sm:px-6">
            <LoaderCircleIcon
              aria-hidden="true"
              className="mt-0.5 size-4 shrink-0 animate-spin text-muted-foreground motion-reduce:animate-none"
            />
            <span>
              <span className="font-medium">{t('app.waking.title')}</span>{' '}
              <span className="text-muted-foreground">{t('app.waking.body')}</span>
            </span>
          </p>
        </div>
      )}
    </div>
  )
}
