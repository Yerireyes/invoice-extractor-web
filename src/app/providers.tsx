import { QueryClientProvider } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { Toaster } from 'sonner'
import '@/i18n'
import { createQueryClient } from './query-client'

// i18n is initialised on import (react-i18next needs no provider). Theme arrives in FRT-APP-0011.
export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient)

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster position="bottom-right" theme="system" richColors closeButton />
    </QueryClientProvider>
  )
}
