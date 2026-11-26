import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from '@/app/App'
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

void enableMocking().then(() => {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
