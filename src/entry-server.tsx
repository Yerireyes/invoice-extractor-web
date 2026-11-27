import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import { createStaticHandler, createStaticRouter, StaticRouterProvider } from 'react-router'
import { Providers } from '@/app/providers'
import { routes } from '@/app/router'
import i18n, { type Language } from '@/i18n'

/** Paths prerendered at build time (FRT-APP-0013). The rest are rendered in the browser. */
export const PRERENDERED_PATHS = ['/'] as const

/**
 * HTML of a route in a language, as the first client render will produce it, so the browser can
 * paint it before the JavaScript arrives and React hydrates it in place. Runs in Node at build time.
 */
export async function render(path: string, language: Language): Promise<string> {
  await i18n.changeLanguage(language)
  const handler = createStaticHandler(routes)
  const context = await handler.query(new Request(new URL(path, 'http://localhost')))
  if (context instanceof Response) throw new Error(`Cannot prerender ${path}: it redirects`)
  const router = createStaticRouter(handler.dataRoutes, context)

  return renderToString(
    <StrictMode>
      <Providers>
        <StaticRouterProvider router={router} context={context} hydrate={false} />
      </Providers>
    </StrictMode>,
  )
}
