/// <reference types="vitest/config" />
import { readFileSync } from 'node:fs'
import { rm } from 'node:fs/promises'
import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'

/** Drops MSW's service worker (copied from public/) from builds that do not use mocks. */
function excludeMockWorker(useMocks: boolean): Plugin {
  let outDir = 'dist'
  return {
    name: 'exclude-mock-worker',
    apply: 'build',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir)
    },
    async closeBundle() {
      if (!useMocks) await rm(path.join(outDir, 'mockServiceWorker.js'), { force: true })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const useMocks = (process.env.VITE_USE_MOCKS ?? env.VITE_USE_MOCKS) === 'true'

  const { version } = JSON.parse(readFileSync('package.json', 'utf8')) as { version: string }

  return {
    plugins: [react(), tailwindcss(), excludeMockWorker(useMocks)],
    define: {
      // Shown in the footer; release-please bumps package.json (FRT-DEP-0012).
      __APP_VERSION__: JSON.stringify(version),
    },
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, './src'),
      },
    },
    test: {
      globals: true,
      environment: './src/test/jsdom-environment.ts',
      setupFiles: ['./src/test/setup.ts'],
      css: false,
      coverage: {
        provider: 'v8',
        include: ['src/**/*.{ts,tsx}'],
        exclude: [
          'src/main.tsx',
          'src/**/*.test.{ts,tsx}',
          'src/test/**',
          'src/components/ui/**',
          'src/lib/api-types.ts',
          'src/mocks/**',
          'src/**/index.ts',
        ],
        thresholds: {
          lines: 70,
          functions: 70,
          branches: 70,
          statements: 70,
        },
      },
    },
  }
})
