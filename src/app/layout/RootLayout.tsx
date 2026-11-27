import { ReceiptTextIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, Outlet } from 'react-router'
import { LanguageSwitcher } from './LanguageSwitcher'

// Header and shell. Theme toggle, footer and privacy link arrive in FRT-APP-0011.
export function RootLayout() {
  const { t } = useTranslation()

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <a
        href="#main"
        className="sr-only rounded-md bg-background px-3 py-2 focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:ring-3 focus:ring-ring/50"
      >
        {t('app.skipToContent')}
      </a>
      <header className="border-b">
        <div className="mx-auto flex h-16 w-full max-w-[66rem] items-center justify-between gap-4 px-4 sm:px-6">
          <Link
            to="/"
            className="-ml-1 flex items-center gap-2 rounded-md px-1 py-1 text-[0.9375rem] font-semibold tracking-tight"
          >
            <ReceiptTextIcon
              aria-hidden="true"
              className="size-5 text-primary"
              strokeWidth={1.75}
            />
            {t('app.name')}
          </Link>
          <LanguageSwitcher />
        </div>
      </header>
      <main id="main" tabIndex={-1} className="flex-1 outline-none">
        <Outlet />
      </main>
    </div>
  )
}
