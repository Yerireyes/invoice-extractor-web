import { QueryClientProvider } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { Toaster } from 'sonner'
import { createQueryClient } from './query-client'

// i18n and theme providers arrive in FRT-LNG-0004 and FRT-APP-0011.
export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient)

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster position="bottom-right" theme="system" richColors closeButton />
    </QueryClientProvider>
  )
}
