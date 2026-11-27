import { create } from 'zustand'
import type { FileError, Limits } from '@/lib/api-models'
import { checkFiles, type Candidate, type SelectionProblem } from './lib/selection'

// Files chosen on "/" before extraction. In memory only (privacy): never persisted.

export interface SelectedFile {
  id: string
  file: File
  /** Object URL for image thumbnails; revoked when the file leaves the selection. */
  previewUrl: string | null
  /** Client-side validation problem: the file is never sent. */
  problem: SelectionProblem | null
  /** Set when the API could not read the file (per-file error from /extract); it can be retried. */
  extractionError: FileError | null
}

interface SelectionState {
  items: SelectedFile[]
  /** Adds files after validating them; returns how many were added (with or without problems). */
  add: (
    candidates: readonly Candidate[],
    rules: { limits: Limits; acceptedMimeTypes: readonly string[] },
  ) => number
  remove: (id: string) => void
  clear: () => void
  /** Records per-file extraction errors (by item id) and clears them on the other given items. */
  setExtractionErrors: (errors: ReadonlyMap<string, FileError>) => void
  /**
   * Removes items WITHOUT revoking their previews: ownership moves to whoever takes them
   * (the invoices batch). Returns the taken items.
   */
  take: (ids: readonly string[]) => SelectedFile[]
}

let nextId = 0
const newId = () => `file-${String(++nextId)}`

function createPreview(file: File): string | null {
  if (!file.type.startsWith('image/') || typeof URL.createObjectURL !== 'function') return null
  return URL.createObjectURL(file)
}

function revoke(item: SelectedFile) {
  if (item.previewUrl) URL.revokeObjectURL(item.previewUrl)
}

export const useSelectionStore = create<SelectionState>()((set, get) => ({
  items: [],

  add: (candidates, rules) => {
    const checked = checkFiles(candidates, get().items, rules)
    const added = checked.map<SelectedFile>(({ file, problem }) => ({
      id: newId(),
      file,
      problem,
      extractionError: null,
      previewUrl: problem?.code === 'UNSUPPORTED_FILE_TYPE' ? null : createPreview(file),
    }))
    set((state) => ({ items: [...state.items, ...added] }))
    return added.length
  },

  remove: (id) => {
    const item = get().items.find((entry) => entry.id === id)
    if (item) revoke(item)
    set((state) => ({ items: state.items.filter((entry) => entry.id !== id) }))
  },

  clear: () => {
    get().items.forEach(revoke)
    set({ items: [] })
  },

  setExtractionErrors: (errors) => {
    set((state) => ({
      items: state.items.map((item) =>
        errors.has(item.id) ? { ...item, extractionError: errors.get(item.id) ?? null } : item,
      ),
    }))
  },

  take: (ids) => {
    const wanted = new Set(ids)
    const taken = get().items.filter((item) => wanted.has(item.id))
    set((state) => ({ items: state.items.filter((item) => !wanted.has(item.id)) }))
    return taken
  },
}))

/** Files that can be sent to /extract (including ones that failed before and can be retried). */
export const selectReadyFiles = (state: Pick<SelectionState, 'items'>) =>
  state.items.filter((item) => item.problem === null)
