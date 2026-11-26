import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll } from 'vitest'
import i18n from '@/i18n'
import { server } from '@/mocks/node'

// jsdom does not implement matchMedia (used by sonner and theme detection).
if (typeof window.matchMedia !== 'function') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string): MediaQueryList =>
      ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        dispatchEvent: () => false,
      }) as unknown as MediaQueryList,
  })
}

// Pointer capture and scrollIntoView are missing in jsdom; Radix (Select, Popover…) needs them.
Object.assign(Element.prototype, {
  hasPointerCapture: () => false,
  setPointerCapture: () => undefined,
  releasePointerCapture: () => undefined,
  scrollIntoView: () => undefined,
})

beforeAll(async () => {
  // Deterministic language for assertions on text; tests that need another one switch it.
  await i18n.changeLanguage('es')
  server.listen({ onUnhandledFrame: 'error' })
})

afterEach(async () => {
  cleanup()
  if (i18n.resolvedLanguage !== 'es') await i18n.changeLanguage('es')
  server.resetHandlers()
})

afterAll(() => {
  server.close()
})
