import type { Environment } from 'vitest/runtime'
import { builtinEnvironments } from 'vitest/runtime'

// jsdom replaces the Fetch API classes with its own (FormData, File, Blob…), which Node's fetch
// (undici, used by MSW in Node) cannot serialise: multipart uploads arrive empty or corrupted.
// This environment sets up jsdom and then restores Node's native Fetch API globals.
const FETCH_GLOBALS = [
  'fetch',
  'Request',
  'Response',
  'Headers',
  'FormData',
  'Blob',
  'File',
  'ReadableStream',
  'AbortController',
  'AbortSignal',
] as const

const jsdomWithNodeFetch: Environment = {
  name: 'jsdom-node-fetch',
  viteEnvironment: 'client',
  async setup(global: Record<string, unknown>, options) {
    const native = Object.fromEntries(FETCH_GLOBALS.map((key) => [key, global[key]]))
    const env = await builtinEnvironments.jsdom.setup(global, options)
    Object.assign(global, native)
    // jsdom's XMLHttpRequest cannot send Node's FormData either; without it, apiUpload falls back
    // to fetch (intercepted by MSW). The XHR path is unit-tested with a fake XMLHttpRequest.
    delete global.XMLHttpRequest
    return env
  },
}

export default jsdomWithNodeFetch
