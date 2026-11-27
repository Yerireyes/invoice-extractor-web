import { normalizeInvoice } from '@/lib/api-models'
import { useInvoicesStore, type BatchInvoice } from './invoices'

const entry = (id: string, previewUrl: string | null = `blob:${id}`): BatchInvoice => ({
  id,
  fileName: `${id}.png`,
  file: new File(['x'], `${id}.png`, { type: 'image/png' }),
  previewUrl,
  invoice: normalizeInvoice({ document_type: 'invoice', line_items: [] }),
  validation: { status: 'valid', issues: [] },
  fieldConfidence: {},
  meta: null,
})

describe('invoices store', () => {
  afterEach(() => {
    useInvoicesStore.getState().clear()
    vi.restoreAllMocks()
  })

  it('adds, removes and clears invoices, revoking their previews', () => {
    const revoke = vi.spyOn(URL, 'revokeObjectURL')
    const { add } = useInvoicesStore.getState()
    add([entry('a'), entry('b', null), entry('c')])

    useInvoicesStore.getState().remove('a')
    expect(revoke).toHaveBeenCalledWith('blob:a')
    expect(useInvoicesStore.getState().invoices.map((invoice) => invoice.id)).toEqual(['b', 'c'])

    useInvoicesStore.getState().clear()
    expect(revoke).toHaveBeenCalledWith('blob:c')
    expect(revoke).toHaveBeenCalledTimes(2)
    expect(useInvoicesStore.getState().invoices).toEqual([])
  })
})
