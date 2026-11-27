const UNITS = ['byte', 'kilobyte', 'megabyte', 'gigabyte'] as const

/** 1258291 → "1,2 MB" (es) / "1.2 MB" (en). Decimal steps of 1024, one fraction digit above KB. */
export function formatBytes(bytes: number, locale: string): string {
  let value = Math.max(0, bytes)
  let unit = 0
  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024
    unit++
  }
  return new Intl.NumberFormat(locale, {
    style: 'unit',
    unit: UNITS[unit],
    unitDisplay: 'short',
    maximumFractionDigits: unit >= 2 ? 1 : 0,
  }).format(value)
}
