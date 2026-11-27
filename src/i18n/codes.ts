import { CLIENT_ERROR_CODES } from '@/lib/api-client'
import type { ErrorCode, FileErrorCode } from '@/lib/api-models'

// Every code the contract can return. The tests check that each one has a translation in every
// language, so a new code in the contract shows up as a failing test instead of a raw key.

/** HTTP errors (contract section 5). */
export const HTTP_ERROR_CODES = [
  'TOO_MANY_FILES',
  'NO_FILES',
  'TOO_MANY_INVOICES',
  'VALIDATION_ERROR',
  'PROVIDER_NOT_AVAILABLE',
  'NOT_FOUND',
  'METHOD_NOT_ALLOWED',
  'RATE_LIMITED',
  'LLM_QUOTA_EXCEEDED',
  'LLM_UNAVAILABLE',
  'REQUEST_TOO_LARGE',
  'INTERNAL_ERROR',
] as const satisfies readonly ErrorCode[]

// Compile-time check: fails to type-check if the generated ErrorCode enum gains a code missing above.
type MissingHttpCodes = Exclude<ErrorCode, (typeof HTTP_ERROR_CODES)[number]>
export const HTTP_CODES_ARE_EXHAUSTIVE: [MissingHttpCodes] extends [never]
  ? true
  : MissingHttpCodes = true

/** Errors produced by the client itself (no response from the API). */
export const CLIENT_CODES = Object.values(CLIENT_ERROR_CODES)

/** Per-file errors inside `results[]` of /invoices/extract (contract section 2.2). */
export const FILE_ERROR_CODES = [
  'NOT_AN_INVOICE',
  'UNREADABLE_FILE',
  'UNSUPPORTED_FILE_TYPE',
  'FILE_TOO_LARGE',
  'PDF_TOO_MANY_PAGES',
  'EXTRACTION_FAILED',
] as const satisfies readonly FileErrorCode[]

type MissingFileCodes = Exclude<FileErrorCode, (typeof FILE_ERROR_CODES)[number]>
export const FILE_CODES_ARE_EXHAUSTIVE: [MissingFileCodes] extends [never]
  ? true
  : MissingFileCodes = true

/** Validation issues (contract section 4). */
export const ISSUE_CODES = [
  'MISSING_REQUIRED_FIELD',
  'INVALID_CURRENCY',
  'TOTAL_MISMATCH',
  'SUBTOTAL_MISMATCH',
  'LINE_AMOUNT_MISMATCH',
  'TAX_MISMATCH',
  'DUE_BEFORE_ISSUE',
  'FUTURE_DATE',
  'LOW_CONFIDENCE',
] as const
