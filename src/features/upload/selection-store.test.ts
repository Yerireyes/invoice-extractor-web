import { DEFAULT_ACCEPTED_MIME_TYPES, DEFAULT_LIMITS } from './lib/selection'
import { selectReadyFiles, useSelectionStore } from './selection-store'

const rules = { limits: DEFAULT_LIMITS, acceptedMimeTypes: DEFAULT_ACCEPTED_MIME_TYPES }
const image = (name: string) => new File(['img'], name, { type: 'image/png' })

describe('selection store', () => {
  afterEach(() => {
    useSelectionStore.getState().clear()
    vi.restoreAllMocks()
  })

  it('adds files with previews for images only and reports how many were added', () => {
    const added = useSelectionStore
      .getState()
      .add(
        [
          { file: image('a.png') },
          { file: new File(['%PDF'], 'b.pdf', { type: 'application/pdf' }) },
        ],
        rules,
      )

    const { items } = useSelectionStore.getState()
    expect(added).toBe(2)
    expect(items[0]?.previewUrl).toMatch(/^blob:/)
    expect(items[1]?.previewUrl).toBeNull()
    expect(selectReadyFiles(useSelectionStore.getState())).toHaveLength(2)
  })

  it('does not create previews for rejected types', () => {
    useSelectionStore
      .getState()
      .add([{ file: new File(['GIF'], 'x.gif', { type: 'image/gif' }) }], rules)
    expect(useSelectionStore.getState().items[0]?.previewUrl).toBeNull()
  })

  it('revokes object URLs when files leave the selection', () => {
    const revoke = vi.spyOn(URL, 'revokeObjectURL')
    const { add } = useSelectionStore.getState()
    add([{ file: image('a.png') }, { file: image('b.png') }, { file: image('c.png') }], rules)
    const [first] = useSelectionStore.getState().items

    useSelectionStore.getState().remove(first?.id ?? '')
    expect(revoke).toHaveBeenCalledWith(first?.previewUrl)
    expect(useSelectionStore.getState().items).toHaveLength(2)

    useSelectionStore.getState().clear()
    expect(revoke).toHaveBeenCalledTimes(3)
    expect(useSelectionStore.getState().items).toEqual([])
  })
})
