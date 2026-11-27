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
