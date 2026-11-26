import { Outlet } from 'react-router'

// Minimal shell; the final header/footer (language, theme, privacy) arrive in FRT-APP-0011.
export function RootLayout() {
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <header className="border-b px-4 py-3">
        <p className="font-heading text-lg font-semibold tracking-tight">Invoice Extractor</p>
      </header>
      <main id="main" className="flex-1 px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
