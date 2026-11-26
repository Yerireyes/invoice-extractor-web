import { QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import type { ReactNode } from 'react'
import { createQueryClient } from '@/app/query-client'
import { meta } from '@/mocks/fixtures/meta'
import { server } from '@/mocks/node'
import { useMeta } from './meta'

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={createQueryClient()}>{children}</QueryClientProvider>
}

describe('useMeta', () => {
  it('loads limits and accepted formats from /meta', async () => {
    const { result } = renderHook(() => useMeta(), { wrapper })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })
    expect(result.current.data?.limits).toEqual(meta.limits)
    expect(result.current.data?.accepted_mime_types).toContain('application/pdf')
  })

  it('requests /meta only once while cached', async () => {
    let calls = 0
    server.use(
      http.get('*/api/v1/meta', () => {
        calls++
        return HttpResponse.json(meta)
      }),
    )
    const client = createQueryClient()
    const shared = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    )

    const first = renderHook(() => useMeta(), { wrapper: shared })
    await waitFor(() => {
      expect(first.result.current.isSuccess).toBe(true)
    })
    const second = renderHook(() => useMeta(), { wrapper: shared })

    expect(second.result.current.data).toEqual(meta)
    expect(calls).toBe(1)
  })
})
