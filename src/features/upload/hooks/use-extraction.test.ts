import { act, renderHook } from '@testing-library/react'
import type { ExtractResponse } from '@/lib/api-models'
import type { SelectedFile } from '../selection-store'
import { pairResults, useCountdown, useElapsedSeconds } from './use-extraction'

const item = (id: string): SelectedFile => ({
  id,
  file: new File(['x'], `${id}.png`, { type: 'image/png' }),
  previewUrl: `blob:${id}`,
  problem: null,
  extractionError: null,
})

describe('pairResults', () => {
  it('pairs results with files by order and normalises successes', () => {
    const response: ExtractResponse = {
      results: [
        {
          file_name: 'a.png',
          status: 'success',
          invoice: { document_type: 'invoice', total: '10.00', line_items: [] },
          validation: { status: 'valid' },
          meta: { provider: 'fake', model: 'fake', pages: 1, processing_ms: 5 },
        },
        { file_name: 'b.png', status: 'error', error: { code: 'NOT_AN_INVOICE' } },
      ],
      summary: { total: 2, succeeded: 1, failed: 1 },
    }

    const { invoices, errors } = pairResults([item('a'), item('b'), item('c')], response)

    expect(invoices).toHaveLength(1)
    expect(invoices[0]).toMatchObject({
      id: 'a',
      fileName: 'a.png',
      previewUrl: 'blob:a',
      fieldConfidence: {},
      validation: { status: 'valid', issues: [] },
    })
    expect(invoices[0]?.invoice.issuer.name).toBeNull()
    expect(errors.get('b')).toEqual({ code: 'NOT_AN_INVOICE' })
    // A missing result is treated as a failed extraction rather than silently dropped
    expect(errors.get('c')).toEqual({ code: 'EXTRACTION_FAILED', params: {} })
  })
})

describe('timers', () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date('2026-11-26T10:00:00Z') })
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('counts down to a deadline and stops at zero', () => {
    const deadline = Date.now() + 3000
    const { result } = renderHook(() => useCountdown(deadline))
    expect(result.current).toBe(3)

    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(result.current).toBe(2)

    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(result.current).toBe(0)
  })

  it('returns zero without a deadline', () => {
    const { result } = renderHook(() => useCountdown(null))
    expect(result.current).toBe(0)
  })

  it('counts elapsed seconds while running', () => {
    const initialProps: { start: number | null } = { start: Date.now() }
    const { result, rerender } = renderHook(({ start }) => useElapsedSeconds(start), {
      initialProps,
    })
    act(() => {
      vi.advanceTimersByTime(2500)
    })
    expect(result.current).toBe(2)

    rerender({ start: null })
    expect(result.current).toBe(0)
  })
})
