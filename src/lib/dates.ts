const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/

/**
 * "2026-11-20" → "20 nov 2026" (es) / "Nov 20, 2026" (en).
 * Contract dates have no time zone, so they are formatted in UTC to avoid off-by-one days.
 * Returns the raw value when it is not a valid ISO date.
 */
export function formatDate(
  value: string,
  locale: string,
  style: Intl.DateTimeFormatOptions['dateStyle'] = 'medium',
): string {
  const match = ISO_DATE.exec(value)
  if (!match) return value

  const [, year, month, day] = match.map(Number) as [number, number, number, number]
  const date = new Date(Date.UTC(year, month - 1, day))
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return value

  return new Intl.DateTimeFormat(locale, { dateStyle: style, timeZone: 'UTC' }).format(date)
}
