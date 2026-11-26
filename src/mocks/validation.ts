import type { Invoice, Issue, Validation } from '@/lib/api-models'

// Simplified port of the backend rules (contract section 4) so mock mode reacts to edits.
// Mocks only: the real app never does arithmetic on amounts — the backend validates.
// Plain numbers are acceptable here because results are rounded to cents with a ±0.02 tolerance.

const TOLERANCE = 0.02
const LOW_CONFIDENCE_THRESHOLD = 0.7

const num = (value: string | null | undefined): number | null =>
  value === null || value === undefined || value.trim() === '' ? null : Number(value)

const money = (value: number): string => (Math.round(value * 100) / 100).toFixed(2)

const differs = (a: number, b: number) => Math.abs(a - b) > TOLERANCE

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export function validateInvoice(
  invoice: Invoice,
  fieldConfidence?: Record<string, number>,
): Validation {
  const issues: Issue[] = []
  const add = (issue: Omit<Issue, 'params'> & { params?: Issue['params'] }) => {
    issues.push({ params: {}, ...issue })
  }

  // Required fields
  const required: [string, unknown][] = [
    ['issue_date', invoice.issue_date],
    ['currency', invoice.currency],
    ['issuer.name', invoice.issuer.name],
    ['total', invoice.total],
  ]
  for (const [field, value] of required) {
    if (value === null || value === undefined || value === '') {
      add({ code: 'MISSING_REQUIRED_FIELD', severity: 'error', field })
    }
  }

  if (invoice.currency && !/^[A-Z]{3}$/.test(invoice.currency)) {
    add({
      code: 'INVALID_CURRENCY',
      severity: 'error',
      field: 'currency',
      params: { value: invoice.currency },
    })
  }

  // Line amounts
  invoice.line_items.forEach((line, index) => {
    const quantity = num(line.quantity)
    const unitPrice = num(line.unit_price)
    const amount = num(line.amount)
    if (quantity === null || unitPrice === null || amount === null) return
    const expected = quantity * unitPrice - (num(line.discount) ?? 0)
    if (differs(expected, amount)) {
      add({
        code: 'LINE_AMOUNT_MISMATCH',
        severity: 'warning',
        field: `line_items.${index}.amount`,
        params: { line: index + 1, expected: money(expected), actual: money(amount) },
      })
    }
  })

  // Subtotal vs line items
  const subtotal = num(invoice.subtotal)
  const lineAmounts = invoice.line_items.map((line) => num(line.amount))
  if (subtotal !== null && lineAmounts.length > 0 && lineAmounts.every((a) => a !== null)) {
    const expected = lineAmounts.reduce((sum, a) => sum + a, 0)
    if (differs(expected, subtotal)) {
      add({
        code: 'SUBTOTAL_MISMATCH',
        severity: 'error',
        field: 'subtotal',
        params: { expected: money(expected), actual: money(subtotal) },
      })
    }
  }

  // Taxes
  invoice.taxes.forEach((tax, index) => {
    const base = num(tax.base)
    const rate = num(tax.rate)
    const amount = num(tax.amount)
    if (base === null || rate === null || amount === null) return
    const expected = (base * rate) / 100
    if (differs(expected, amount)) {
      add({
        code: 'TAX_MISMATCH',
        severity: 'warning',
        field: `taxes.${index}.amount`,
        params: { index, expected: money(expected), actual: money(amount) },
      })
    }
  })

  // Total
  const total = num(invoice.total)
  const taxAmounts = invoice.taxes.map((tax) => num(tax.amount))
  if (subtotal !== null && total !== null && taxAmounts.every((a) => a !== null)) {
    const expected =
      subtotal - (num(invoice.discount_total) ?? 0) + taxAmounts.reduce((sum, a) => sum + a, 0)
    if (differs(expected, total)) {
      add({
        code: 'TOTAL_MISMATCH',
        severity: 'error',
        field: 'total',
        params: { expected: money(expected), actual: money(total) },
      })
    }
  }

  // Dates (ISO strings compare lexicographically)
  if (invoice.due_date && invoice.issue_date && invoice.due_date < invoice.issue_date) {
    add({ code: 'DUE_BEFORE_ISSUE', severity: 'warning', field: 'due_date' })
  }
  if (invoice.issue_date && invoice.issue_date > today()) {
    add({ code: 'FUTURE_DATE', severity: 'warning', field: 'issue_date' })
  }

  // Low confidence (only reported by /extract)
  for (const [field, confidence] of Object.entries(fieldConfidence ?? {})) {
    if (confidence < LOW_CONFIDENCE_THRESHOLD) {
      add({ code: 'LOW_CONFIDENCE', severity: 'info', field, params: { confidence } })
    }
  }

  const status: Validation['status'] = issues.some((i) => i.severity === 'error')
    ? 'invalid'
    : issues.length > 0
      ? 'warnings'
      : 'valid'

  return { status, issues }
}
