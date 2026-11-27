/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** API base URL without /api/v1. Empty → same origin. */
  readonly VITE_API_URL?: string
  /** 'true' enables Mock Service Worker in the browser. */
  readonly VITE_USE_MOCKS?: string
}

/** package.json version, injected at build time. */
declare const __APP_VERSION__: string

interface ImportMeta {
  readonly env: ImportMetaEnv
}
