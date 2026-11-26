/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** API base URL without /api/v1. Empty → same origin. */
  readonly VITE_API_URL?: string
  /** 'true' enables Mock Service Worker in the browser. */
  readonly VITE_USE_MOCKS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
