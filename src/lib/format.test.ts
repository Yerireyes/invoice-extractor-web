import { formatDate } from './dates'
import { resolveIntlLocale } from './locale'
import { formatMoney, formatPercent, isDecimalString } from './money'

const plain = (text: string) => text.replace(/\s/g, ' ')

describe('formatMoney', () => {
  it.each([
    ['1160.00', 'MXN', 'es-MX', '$1,160.00'],
    ['1160.00', 'MXN', 'en-US', 'MX$1,160.00'],
    ['1590.5', 'EUR', 'es-ES', '1590,50 €'],
    ['-225.00', 'EUR', 'en', '-€225.00'],
    ['69.10', 'USD', 'en-US', '$69.10'],
  ])('%s %s in %s → %s', (value, currency, locale, expected) => {
    expect(plain(formatMoney(value, currency, locale))).toBe(expected)
  })

  it('keeps full precision of decimal strings (no float rounding)', () => {
    expect(formatMoney('12345678901234567.89', 'USD', 'en-US')).toBe('$12,345,678,901,234,567.89')
  })

  it('falls back to a plain number with the code for invalid currencies', () => {
    expect(plain(formatMoney('10.5', 'euro', 'es'))).toBe('10,50 euro')
    expect(formatMoney('10.5', '', 'en')).toBe('10.50')
  })

  it('returns the raw value when it is not a decimal string', () => {
    expect(formatMoney('abc', 'USD', 'en')).toBe('abc')
  })
})

describe('isDecimalString', () => {
  it.each([
    ['1', true],
    ['-1.50', true],
    [' 2.5 ', true],
    ['1,50', false],
    ['1e3', false],
    [12, false],
  ])('%s → %s', (value, expected) => {
    expect(isDecimalString(value)).toBe(expected)
  })
})

describe('formatPercent', () => {
  it('formats tax rates given as percentages', () => {
    expect(plain(formatPercent('16', 'es'))).toBe('16 %')
    expect(formatPercent('8.875', 'en-US')).toBe('8.875%')
    expect(formatPercent(21, 'en-US')).toBe('21%')
  })

  it('formats 0..1 ratios such as confidence', () => {
    expect(formatPercent(0.62, 'en-US', { ratio: true })).toBe('62%')
  })

  it('returns non-numeric strings untouched', () => {
    expect(formatPercent('n/a', 'en')).toBe('n/a')
  })
})

describe('formatDate', () => {
  it('formats ISO dates per locale without shifting the day', () => {
    expect(formatDate('2026-11-20', 'en-US')).toBe('Nov 20, 2026')
    expect(formatDate('2026-01-01', 'es-ES', 'long')).toBe('1 de enero de 2026')
  })

  it('returns invalid dates untouched', () => {
    expect(formatDate('2026-02-30', 'en')).toBe('2026-02-30')
    expect(formatDate('20/11/2026', 'en')).toBe('20/11/2026')
  })
})

describe('resolveIntlLocale', () => {
  it('keeps the browser region when it matches the app language', () => {
    expect(resolveIntlLocale('es', ['en-US', 'es-MX'])).toBe('es-MX')
    expect(resolveIntlLocale('en', ['en-GB'])).toBe('en-GB')
  })

  it('uses the bare language otherwise', () => {
    expect(resolveIntlLocale('es', ['fr-FR'])).toBe('es')
    expect(resolveIntlLocale('en', [])).toBe('en')
  })
})
