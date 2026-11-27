import {
  checkFiles,
  DEFAULT_LIMITS,
  formatLabels,
  toAcceptMap,
  type CheckedFile,
} from './selection'

const rules = {
  limits: { ...DEFAULT_LIMITS, max_files_per_request: 3, max_file_size_mb: 1 },
  acceptedMimeTypes: ['image/jpeg', 'image/png', 'application/pdf'],
}

function file(name: string, type = 'image/jpeg', size = 100, lastModified = 1) {
  const result = new File(['x'], name, { type, lastModified })
  Object.defineProperty(result, 'size', { value: size })
  return result
}

const problems = (checked: CheckedFile[]) => checked.map((item) => item.problem?.code ?? null)

describe('checkFiles', () => {
  it('accepts supported files within the limits', () => {
    const checked = checkFiles(
      [{ file: file('a.jpg') }, { file: file('b.pdf', 'application/pdf') }],
      [],
      rules,
    )
    expect(problems(checked)).toEqual([null, null])
  })

  it('rejects unsupported types, including the ones the picker already rejected', () => {
    const checked = checkFiles(
      [{ file: file('cat.gif', 'image/gif') }, { file: file('a.jpg'), typeRejected: true }],
      [],
      rules,
    )
    expect(problems(checked)).toEqual(['UNSUPPORTED_FILE_TYPE', 'UNSUPPORTED_FILE_TYPE'])
  })

  it('rejects empty and oversized files with the limit', () => {
    const checked = checkFiles(
      [
        { file: file('empty.jpg', 'image/jpeg', 0) },
        { file: file('big.jpg', 'image/jpeg', 1024 * 1024 + 1) },
      ],
      [],
      rules,
    )
    expect(checked.map((item) => item.problem)).toEqual([
      { code: 'EMPTY_FILE' },
      { code: 'FILE_TOO_LARGE', maxMb: 1 },
    ])
  })

  it('flags duplicates within the batch and against the existing selection', () => {
    const existing = [{ file: file('a.jpg'), problem: null }]
    const checked = checkFiles(
      [{ file: file('a.jpg') }, { file: file('b.jpg') }, { file: file('b.jpg') }],
      existing,
      rules,
    )
    expect(problems(checked)).toEqual(['DUPLICATE_FILE', null, 'DUPLICATE_FILE'])
  })

  it('only lets valid files use up the per-request limit', () => {
    const existing = [
      { file: file('a.jpg'), problem: null },
      { file: file('bad.gif', 'image/gif'), problem: { code: 'UNSUPPORTED_FILE_TYPE' as const } },
    ]
    const checked = checkFiles(
      [{ file: file('b.jpg') }, { file: file('c.jpg') }, { file: file('d.jpg') }],
      existing,
      rules,
    )
    expect(checked.map((item) => item.problem)).toEqual([
      null,
      null,
      { code: 'TOO_MANY_FILES', max: 3 },
    ])
  })
})

describe('accept helpers', () => {
  it('maps MIME types to extensions for the file picker', () => {
    expect(toAcceptMap(['image/jpeg', 'application/pdf', 'image/heic'])).toEqual({
      'image/jpeg': ['.jpg', '.jpeg'],
      'application/pdf': ['.pdf'],
      'image/heic': [],
    })
  })

  it('builds short labels', () => {
    expect(formatLabels(['image/jpeg', 'image/webp', 'application/pdf', 'image/heic'])).toEqual([
      'JPG',
      'WEBP',
      'PDF',
      'IMAGE/HEIC',
    ])
  })
})
