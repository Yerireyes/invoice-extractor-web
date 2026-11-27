// Amounts travel as decimal strings ("1234.50") and are never converted to number for math.
// Intl.NumberFormat accepts decimal strings directly (exact, no float rounding), so formatting
// keeps full precision. Arithmetic validation is the backend's job.

const DECIMAL = /^-?\d+(\.\d+)?$/

export function isDecimalString(value: unknown): value is `${number}` {
  return typeof value === 'string' && DECIMAL.test(value.trim())
}

/**
 * "1160.00" + "MXN" + "es-MX" → "$1,160.00". Falls back to a plain number plus the code when the
 * currency is not valid ISO 4217, and to the raw value when it is not a decimal string.
 */
export function formatMoney(
  value: string,
  currency: string,
  locale: string,
  { currencyDisplay }: { currencyDisplay?: 'symbol' | 'narrowSymbol' | 'code' } = {},
): string {
  const amount = value.trim()
  if (!isDecimalString(amount)) return value

  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency, currencyDisplay }).format(
      amount,
    )
  } catch {
    const number = new Intl.NumberFormat(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 20,
    }).format(amount)
    return currency ? `${number} ${currency}` : number
  }
}

/** Percentages such as tax rates ("16" → "16 %"), and 0..1 ratios such as confidence (0.62 → "62 %"). */
export function formatPercent(
  value: number | string,
  locale: string,
  { ratio = false } = {},
): string {
  if (typeof value === 'string' && !isDecimalString(value)) return value
  const ratioValue = ratio ? value : typeof value === 'number' ? value / 100 : `${value}E-2`
  return new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 3 }).format(
    ratioValue as number,
  )
}

/** The API's decimal format: up to 15 integer digits and 6 decimals. */
export const API_DECIMAL = /^-?\d{1,15}(\.\d{1,6})?$/

function separators(locale: string) {
  const parts = new Intl.NumberFormat(locale).formatToParts(1234567.8)
  return {
    group: parts.find((part) => part.type === 'group')?.value ?? ',',
    decimal: parts.find((part) => part.type === 'decimal')?.value ?? '.',
  }
}

/**
 * Reads what a person typed ("1.234,50", "1,234.50", "1234,5", "-12") and returns the API's
 * decimal string ("1234.50"), '' when empty, or undefined when it is not a valid amount. A single
 * separator is decimal unless it is the locale's group separator followed by exactly 3 digits.
 */
export function parseDecimalInput(text: string, locale: string): string | undefined {
  const compact = text.replace(/[\s\u00a0\u202f']/g, '').replace(/^[−–]/, '-')
  if (compact === '') return ''
  const match = /^(-?)([\d.,]+)$/.exec(compact)
  if (!match) return undefined
  const [, sign = '', body = ''] = match

  const lastDot = body.lastIndexOf('.')
  const lastComma = body.lastIndexOf(',')
  let integer = body
  let fraction = ''

  if (lastDot !== -1 && lastComma !== -1) {
    const point = Math.max(lastDot, lastComma)
    integer = body.slice(0, point)
    // The decimal mark can appear only once: "1,2,3.4.5" is not an amount.
    if (integer.includes(body.charAt(point))) return undefined
    fraction = body.slice(point + 1)
  } else if (lastDot !== -1 || lastComma !== -1) {
    const separator = lastDot !== -1 ? '.' : ','
    const pieces = body.split(separator)
    const isGrouping =
      pieces.length > 2 ||
      (separator === separators(locale).group && pieces[1]?.length === 3 && pieces[0] !== '')
    if (!isGrouping) {
      integer = pieces[0] ?? ''
      fraction = pieces[1] ?? ''
    }
  }

  integer = integer.replace(/[.,]/g, '') || '0'
  if (/[.,]/.test(fraction)) return undefined
  const value = `${sign}${integer}${fraction ? `.${fraction}` : ''}`
  return API_DECIMAL.test(value) ? value : undefined
}

function currencyDigits(currency: string | null): number {
  if (!currency) return 0
  try {
    return (
      new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions()
        .minimumFractionDigits ?? 2
    )
  } catch {
    return 2
  }
}

/**
 * A decimal string as it should look inside an input: the locale's separators, without the
 * currency symbol, padded to the currency's decimals (none for quantities and rates). The exact
 * digits are kept, so reading it back with `parseDecimalInput` gives the same amount.
 */
export function formatDecimalInput(value: string, locale: string, currency: string | null = null) {
  if (!isDecimalString(value)) return value
  const decimals = value.split('.')[1]?.length ?? 0
  const minimum = currencyDigits(currency)
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: minimum,
    maximumFractionDigits: Math.max(minimum, decimals),
  }).format(value)
}
