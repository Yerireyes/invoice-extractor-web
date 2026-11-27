// Currency and country options from the platform's own data (Intl), in the active language.
// No hand-maintained lists: whatever the browser knows about ISO 4217 / ISO 3166-1 is offered.

export interface Option {
  value: string
  label: string
}

const cache = new Map<string, Option[]>()

function memo(key: string, build: () => Option[]): Option[] {
  const cached = cache.get(key)
  if (cached) return cached
  const built = build()
  cache.set(key, built)
  return built
}

/** "MXN · Peso mexicano", sorted by code. */
export function currencyOptions(locale: string): Option[] {
  return memo(`currency:${locale}`, () => {
    const names = new Intl.DisplayNames(locale, { type: 'currency', fallback: 'code' })
    return Intl.supportedValuesOf('currency').map((code) => ({
      value: code,
      label: `${code} · ${names.of(code) ?? code}`,
    }))
  })
}

// Codes Intl names that are not countries a document would carry.
const NOT_COUNTRIES = new Set(['EU', 'EZ', 'UN', 'QO', 'XA', 'XB', 'ZZ'])

/** ISO 3166-1 alpha-2 countries with a localised name, sorted by name. */
export function countryOptions(locale: string): Option[] {
  return memo(`country:${locale}`, () => {
    const names = new Intl.DisplayNames(locale, { type: 'region', fallback: 'none' })
    const options: Option[] = []
    for (let first = 65; first <= 90; first++) {
      for (let second = 65; second <= 90; second++) {
        const code = String.fromCharCode(first, second)
        if (NOT_COUNTRIES.has(code)) continue
        let label: string | undefined
        try {
          label = names.of(code)
        } catch {
          label = undefined
        }
        if (label && label !== code) options.push({ value: code, label })
      }
    }
    return options.sort((a, b) => a.label.localeCompare(b.label, locale))
  })
}

/**
 * Keeps a value that is not in the list (e.g. an invalid currency the AI read) selectable, so the
 * field shows what the invoice says instead of silently switching to another option.
 */
export function withCurrent(options: Option[], current: string): Option[] {
  if (current === '' || options.some((option) => option.value === current)) return options
  return [{ value: current, label: current }, ...options]
}
