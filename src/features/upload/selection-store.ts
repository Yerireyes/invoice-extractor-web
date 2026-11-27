import { create } from 'zustand'
import type { Limits } from '@/lib/api-models'
import { checkFiles, type Candidate, type SelectionProblem } from './lib/selection'

// Files chosen on "/" before extraction. In memory only (privacy): never persisted.

export interface SelectedFile {
  id: string
  file: File
  /** Object URL for image thumbnails; revoked when the file leaves the selection. */
  previewUrl: string | null
  problem: SelectionProblem | null
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
}))

/** Files that can be sent to /extract. */
export const selectReadyFiles = (state: SelectionState) =>
  state.items.filter((item) => item.problem === null)
