import { act, render, screen } from '@testing-library/react'
import { delay, http, HttpResponse } from 'msw'
import { Providers } from '@/app/providers'
import { meta } from '@/mocks/fixtures/meta'
import { server } from '@/mocks/node'
import { ServerWakeNotice, WAKE_NOTICE_AFTER_MS } from './ServerWakeNotice'

describe('ServerWakeNotice', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('explains a slow first answer and goes away when the server responds', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    let answer: () => void = () => undefined
    server.use(
      http.get('*/api/v1/meta', async () => {
        await new Promise<void>((resolve) => {
          answer = resolve
        })
        return HttpResponse.json(meta)
      }),
    )
    render(
      <Providers>
        <ServerWakeNotice />
      </Providers>,
    )

    expect(screen.queryByText('Despertando el servidor…')).not.toBeInTheDocument()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(WAKE_NOTICE_AFTER_MS)
    })
    expect(screen.getByRole('status')).toHaveTextContent('Despertando el servidor…')

    await act(async () => {
      answer()
      await vi.advanceTimersByTimeAsync(50)
    })
    expect(await screen.findByRole('status')).toBeEmptyDOMElement()
  })

  it('says nothing when the server answers quickly', async () => {
    server.use(
      http.get('*/api/v1/meta', async () => {
        await delay(10)
        return HttpResponse.json(meta)
      }),
    )
    render(
      <Providers>
        <ServerWakeNotice />
      </Providers>,
    )
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })
})
