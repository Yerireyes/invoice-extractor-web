import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { App } from '@/app/App'
import i18n from '@/i18n'
import '@/index.css'

async function enableMocking() {
  // Vite replaces the env value at build time: with VITE_USE_MOCKS=false this branch and the
  // dynamic import are removed, so MSW never reaches the production bundle.
  if (import.meta.env.VITE_USE_MOCKS !== 'true') return
  const { startMockWorker } = await import('@/mocks/browser')
  await startMockWorker()
}

const root = document.getElementById('root')
if (!root) throw new Error('Root element #root not found')

const app = (
  <StrictMode>
    <App />
  </StrictMode>
)

void enableMocking().then(() => {
  // index.html put the prerendered page in #root (scripts/prerender.mjs) when it had one for this
  // path; hydrate it if it is in the language i18n resolved, otherwise render from scratch.
  const prerendered = root.dataset.prerendered
  if (prerendered && prerendered === i18n.resolvedLanguage) hydrateRoot(root, app)
  else createRoot(root).render(app)
})
