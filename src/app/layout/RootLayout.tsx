import { ReceiptTextIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, Outlet, useMatches } from 'react-router'
import { cn } from '@/lib/utils'
import { ThemeSwitcher } from '../theme/ThemeSwitcher'
import { Footer } from './Footer'
import { LanguageSwitcher } from './LanguageSwitcher'

/** What a route can ask of the shell through its `handle`. */
export interface RouteHandle {
  /** Full-width work screen instead of the centred reading column. */
  wide?: boolean
  /** Route-specific navigation shown in the header next to the product name. */
  headerNav?: ReactNode
  /** False for full-height workspaces (review), which carry their own privacy note. */
  footer?: boolean
  /** Actions at the right of the header, before the language switcher. */
  headerActions?: ReactNode
}

const handleOf = (value: unknown): RouteHandle =>
  typeof value === 'object' && value !== null ? value : {}

// Header and shell. Theme toggle, footer and privacy link arrive in FRT-APP-0011.
export function RootLayout() {
  const { t } = useTranslation()
  const handle = handleOf(useMatches().at(-1)?.handle)

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <a
        href="#main"
        className="sr-only rounded-md bg-background px-3 py-2 focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:ring-3 focus:ring-ring/50"
      >
        {t('app.skipToContent')}
      </a>
      <header className="h-16 border-b">
        <div
          className={cn(
            'mx-auto flex h-full w-full items-center gap-4 px-4 sm:px-6',
            handle.wide ? 'max-w-none' : 'max-w-[66rem]',
          )}
        >
          <Link
            to="/"
            className="-ml-1 flex items-center gap-2 rounded-md px-1 py-1 text-[0.9375rem] font-semibold tracking-tight whitespace-nowrap"
          >
            <ReceiptTextIcon
              aria-hidden="true"
              className="size-5 text-primary"
              strokeWidth={1.75}
            />
            {t('app.name')}
          </Link>
          {handle.headerNav}
          <div className="ml-auto flex items-center gap-2">
            {handle.headerActions}
            <ThemeSwitcher />
            <LanguageSwitcher />
          </div>
        </div>
      </header>
      <main id="main" tabIndex={-1} className="flex-1 outline-none">
        <Outlet />
      </main>
      {handle.footer !== false && <Footer />}
    </div>
  )
}
