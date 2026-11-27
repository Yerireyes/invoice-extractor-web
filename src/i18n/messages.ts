import type { TFunction } from 'i18next'
import { CLIENT_ERROR_CODES, isApiError } from '@/lib/api-client'
import type { FileError, Issue } from '@/lib/api-models'
import { formatMoney, formatPercent, isDecimalString } from '@/lib/money'

// Turns API codes + params into user-facing text. Unknown codes always fall back to a generic
// message, so the UI never shows a raw key.

const asNumber = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined

/** Text for an HTTP/network error (ApiError) or anything thrown while calling the API. */
export function translateApiError(t: TFunction, error: unknown): string {
  const code = isApiError(error) ? error.code : CLIENT_ERROR_CODES.unknown
  const params = isApiError(error) ? error.params : {}

  // The numeric param each code carries (contract section 5). When it is present the message
  // uses the plural forms (_one/_other) with {{count}}; otherwise, the generic wording.
  const countParam = HTTP_COUNT_PARAMS[code]
  const count = countParam ? asNumber(params[countParam]) : undefined

  return t([`errors.${code}`, 'errors.generic'], count === undefined ? {} : { count })
}

const HTTP_COUNT_PARAMS: Partial<Record<string, string>> = {
  TOO_MANY_FILES: 'max_files',
  TOO_MANY_INVOICES: 'max_invoices',
  RATE_LIMITED: 'retry_after_s',
  LLM_QUOTA_EXCEEDED: 'retry_after_s', // optional
  LLM_UNAVAILABLE: 'retry_after_s', // optional
}

/** Text for a per-file error inside /extract results (contract section 2.2). */
export function translateFileError(t: TFunction, error: FileError): string {
  const keys = [`fileErrors.${error.code}`, 'fileErrors.generic']
  const params = error.params ?? {}

  if (error.code === 'FILE_TOO_LARGE') {
    const count = asNumber(params.max_mb)
    if (count !== undefined) return t(keys, { count })
  }
  if (error.code === 'PDF_TOO_MANY_PAGES') {
    const count = asNumber(params.max_pages)
    const pages = asNumber(params.pages)
    if (count !== undefined && pages !== undefined) {
      return t(['fileErrors.PDF_TOO_MANY_PAGES_detail', ...keys], { count, pages })
    }
  }
  return t(keys)
}

/**
 * Label for a field path from the contract: "issuer.tax_id" → "Issuer tax ID",
 * "line_items.0.amount" → "Amount (line 1)". Unknown paths are returned as-is.
 */
export function fieldLabel(t: TFunction, path: string): string {
  const segments = path.split('.')
  const indexPosition = segments.findIndex((segment) => /^\d+$/.test(segment))
  const key = segments.filter((segment) => !/^\d+$/.test(segment)).join('.')
  const label = t(`fields.${key}`, { defaultValue: path })

  if (indexPosition === -1) return label
  const number = Number(segments[indexPosition]) + 1
  const collection = segments[0]
  if (collection === 'line_items') return t('fields.lineSuffix', { label, number })
  if (collection === 'taxes') return t('fields.taxSuffix', { label, number })
  return label
}

export interface IssueContext {
  /** Invoice currency, used to format monetary params. */
  currency: string
  /** Intl locale for numbers. */
  locale: string
}

/** Text for a validation issue, with amounts formatted in the invoice currency. */
export function translateIssue(
  t: TFunction,
  issue: Issue,
  { currency, locale }: IssueContext,
): string {
  const params: Record<string, unknown> = { ...issue.params }

  for (const key of ['expected', 'actual'] as const) {
    if (isDecimalString(params[key])) params[key] = formatMoney(params[key], currency, locale)
  }
  if (typeof params.confidence === 'number') {
    params.confidence = formatPercent(params.confidence, locale, { ratio: true })
  }
  // `line` and `index` are 0-based in the contract; people count from 1.
  if (typeof params.line === 'number') params.line = params.line + 1
  if (typeof params.index === 'number') params.number = params.index + 1
  params.field = issue.field ? fieldLabel(t, issue.field) : ''

  return t([`issues.${issue.code}`, 'issues.generic'], params)
}
