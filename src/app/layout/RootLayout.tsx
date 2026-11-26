import { useTranslation } from 'react-i18next'
import { Outlet } from 'react-router'
import { LanguageSwitcher } from './LanguageSwitcher'

// Minimal shell; the final header/footer (theme, privacy, GitHub) arrive in FRT-APP-0011.
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
      <header className="flex items-center justify-between gap-4 border-b px-4 py-3">
        <p className="font-heading text-lg font-semibold tracking-tight">{t('app.name')}</p>
        <LanguageSwitcher />
      </header>
      <main id="main" tabIndex={-1} className="flex-1 px-4 py-6 outline-none">
        <Outlet />
      </main>
    </div>
  )
}
