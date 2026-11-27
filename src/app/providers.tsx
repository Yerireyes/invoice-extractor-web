import { QueryClientProvider } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { Toaster } from 'sonner'
import '@/i18n'
import { createQueryClient } from './query-client'
import { useThemeStore } from './theme/theme'

// i18n is initialised on import (react-i18next needs no provider); the theme is a small store.
export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient)
  const theme = useThemeStore((state) => state.resolved)

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster position="bottom-right" theme={theme} richColors closeButton />
    </QueryClientProvider>
  )
}
