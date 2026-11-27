import { http, HttpResponse } from 'msw'
import { server } from '@/mocks/node'
import { apiUpload, CLIENT_ERROR_CODES, isAbortError } from './api-client'

const form = () => {
  const data = new FormData()
  data.append('files', new File(['png'], 'a.png', { type: 'image/png' }))
  return data
}

describe('apiUpload', () => {
  it('sends multipart data and resolves with the JSON body', async () => {
    let received: string[] = []
    server.use(
      http.post('*/api/v1/upload-test', async ({ request }) => {
        const data = await request.formData()
        received = data
          .getAll('files')
          .map((entry) => (typeof entry === 'string' ? entry : entry.name))
        return HttpResponse.json({ ok: true })
      }),
    )

    await expect(apiUpload('/upload-test', form())).resolves.toEqual({ ok: true })
    expect(received).toEqual(['a.png'])
  })

  it('throws ApiError with code and params from a problem response', async () => {
    server.use(
      http.post('*/api/v1/upload-test', () =>
        HttpResponse.json(
          {
            title: 'Too Many Requests',
            status: 429,
            code: 'RATE_LIMITED',
            params: { retry_after_s: 12 },
          },
          { status: 429 },
        ),
      ),
    )

    await expect(apiUpload('/upload-test', form())).rejects.toMatchObject({
      code: 'RATE_LIMITED',
      status: 429,
      params: { retry_after_s: 12 },
    })
  })

  it('uses UNKNOWN_ERROR for non-problem error bodies', async () => {
    server.use(http.post('*/api/v1/upload-test', () => new HttpResponse('oops', { status: 502 })))

    await expect(apiUpload('/upload-test', form())).rejects.toMatchObject({
      code: CLIENT_ERROR_CODES.unknown,
      status: 502,
    })
  })

  it('maps network failures to NETWORK_ERROR', async () => {
    server.use(http.post('*/api/v1/upload-test', () => HttpResponse.error()))

    await expect(apiUpload('/upload-test', form())).rejects.toMatchObject({
      code: CLIENT_ERROR_CODES.network,
      status: 0,
    })
  })

  it('rejects with an AbortError when the signal is aborted', async () => {
    const controller = new AbortController()
    controller.abort()
    const error = await apiUpload('/upload-test', form(), { signal: controller.signal }).catch(
      (e: unknown) => e,
    )
    expect(isAbortError(error)).toBe(true)
  })
})

describe('apiUpload with XMLHttpRequest', () => {
  class FakeXhr {
    static last: FakeXhr | undefined
    status = 0
    responseText = ''
    sent: unknown
    headers: Record<string, string> = {}
    private listeners: Record<string, (() => void)[]> = {}
    upload = {
      listeners: [] as ((event: ProgressEvent) => void)[],
      done: [] as (() => void)[],
      addEventListener: (type: string, listener: (event: ProgressEvent) => void) => {
        if (type === 'load') this.upload.done.push(listener as () => void)
        else this.upload.listeners.push(listener)
      },
    }
    constructor() {
      FakeXhr.last = this
    }
    open() {
      // no-op: the fake never opens a connection
    }
    setRequestHeader(name: string, value: string) {
      this.headers[name] = value
    }
    addEventListener(type: string, listener: () => void) {
      ;(this.listeners[type] ??= []).push(listener)
    }
    send(body: unknown) {
      this.sent = body
    }
    abort() {
      this.emit('abort')
    }
    emit(type: string) {
      this.listeners[type]?.forEach((listener) => {
        listener()
      })
    }
    progress(loaded: number, total: number) {
      this.upload.listeners.forEach((listener) => {
        listener({ lengthComputable: true, loaded, total } as ProgressEvent)
      })
    }
    respond(status: number, body: unknown) {
      this.status = status
      this.responseText = typeof body === 'string' ? body : JSON.stringify(body)
      this.emit('load')
    }
  }

  beforeEach(() => {
    vi.stubGlobal('XMLHttpRequest', FakeXhr)
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('reports upload progress and resolves with the JSON body', async () => {
    const progress: { loaded: number; total: number }[] = []
    const onUploadDone = vi.fn()
    const promise = apiUpload('/upload-test', form(), {
      onUploadProgress: (value) => progress.push(value),
      onUploadDone,
    })
    const xhr = FakeXhr.last
    xhr?.progress(50, 200)
    xhr?.progress(200, 200)
    xhr?.upload.done.forEach((listener) => {
      listener()
    })
    xhr?.respond(200, { ok: true })
    expect(onUploadDone).toHaveBeenCalledOnce()

    await expect(promise).resolves.toEqual({ ok: true })
    expect(progress).toEqual([
      { loaded: 50, total: 200 },
      { loaded: 200, total: 200 },
    ])
    expect(xhr?.sent).toBeInstanceOf(FormData)
    expect(xhr?.headers.Accept).toBe('application/json')
  })

  it('turns problem responses into ApiError', async () => {
    const promise = apiUpload('/upload-test', form())
    FakeXhr.last?.respond(503, { status: 503, code: 'LLM_UNAVAILABLE', params: {} })
    await expect(promise).rejects.toMatchObject({ code: 'LLM_UNAVAILABLE', status: 503 })
  })

  it('handles unparsable bodies, network errors and aborts', async () => {
    const bad = apiUpload('/upload-test', form())
    FakeXhr.last?.respond(500, '<html>')
    await expect(bad).rejects.toMatchObject({ code: CLIENT_ERROR_CODES.unknown, status: 500 })

    const offline = apiUpload('/upload-test', form())
    FakeXhr.last?.emit('error')
    await expect(offline).rejects.toMatchObject({ code: CLIENT_ERROR_CODES.network })

    const controller = new AbortController()
    const aborted = apiUpload('/upload-test', form(), { signal: controller.signal })
    controller.abort()
    expect(isAbortError(await aborted.catch((e: unknown) => e))).toBe(true)
  })
})
