import type { TFunction } from 'i18next'
import { formatLabels, type SelectionProblem } from './selection'

/** "JPG, PNG, WEBP o PDF" in the active language. */
export function formatList(mimeTypes: readonly string[], locale: string): string {
  return new Intl.ListFormat(locale, { type: 'disjunction' }).format(formatLabels(mimeTypes))
}

export function problemText(
  t: TFunction,
  problem: SelectionProblem,
  { formats }: { formats: string },
): string {
  switch (problem.code) {
    case 'UNSUPPORTED_FILE_TYPE':
      return t('upload.problems.UNSUPPORTED_FILE_TYPE', { formats })
    case 'FILE_TOO_LARGE':
      return t('upload.problems.FILE_TOO_LARGE', { count: problem.maxMb })
    case 'TOO_MANY_FILES':
      return t('upload.problems.TOO_MANY_FILES', { count: problem.max })
    case 'EMPTY_FILE':
      return t('upload.problems.EMPTY_FILE')
    case 'DUPLICATE_FILE':
      return t('upload.problems.DUPLICATE_FILE')
  }
}
