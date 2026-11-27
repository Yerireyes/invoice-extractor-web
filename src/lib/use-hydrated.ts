import { useSyncExternalStore } from 'react'

const subscribe = () => () => undefined

/**
 * False on the server and during hydration, true afterwards. For the few details that depend on
 * the browser (saved theme, toasts): rendering them only once hydrated keeps the prerendered HTML
 * and the first client render identical.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  )
}
