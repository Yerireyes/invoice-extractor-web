import { formatDecimalInput, parseDecimalInput } from './money'

const plain = (text: string) => text.replace(/\s/g, ' ')

describe('parseDecimalInput', () => {
  it.each([
    ['1234.50', 'en', '1234.50'],
    ['1,234.50', 'en', '1234.50'],
    ['1.234,50', 'es', '1234.50'],
    ['1234,5', 'es', '1234.5'],
    ['1 234,50', 'fr', '1234.50'],
    ['1,234', 'en', '1234'],
    ['1.234', 'es', '1234'],
    ['1.234', 'en', '1.234'],
    ['0,70', 'en', '0.70'],
    ['1.234.567', 'es', '1234567'],
    ['-12', 'es', '-12'],
    ['−12,5', 'es', '-12.5'],
    [',5', 'es', '0.5'],
    ['  ', 'es', ''],
  ])('reads %j in %s as %j', (text, locale, expected) => {
    expect(parseDecimalInput(text, locale)).toBe(expected)
  })

  it.each(['abc', '12a', '1,2,3.4.5', '1.2345678', '1234567890123456', '--1'])(
    'rejects %j',
    (text) => {
      expect(parseDecimalInput(text, 'es')).toBeUndefined()
    },
  )
})

describe('formatDecimalInput', () => {
  it.each([
    ['1000.00', 'es', 'MXN', '1000,00'],
    ['10000.5', 'es', 'EUR', '10.000,50'],
    ['1160', 'en', 'USD', '1,160.00'],
    ['102', 'en', 'JPY', '102'],
    ['0.125', 'en', 'USD', '0.125'],
    ['16', 'es', null, '16'],
    ['2.5', 'es', null, '2,5'],
    ['abc', 'es', 'EUR', 'abc'],
  ])('shows %j in %s (%s) as %j', (value, locale, currency, expected) => {
    expect(plain(formatDecimalInput(value, locale, currency))).toBe(expected)
  })

  it.each([
    ['1234567.89', '1234567.89'],
    ['0.70', '0.70'],
    ['-15.000001', '-15.000001'],
    ['500', '500.00'],
  ])('round-trips %j through parseDecimalInput', (value, expected) => {
    for (const locale of ['es', 'en', 'fr']) {
      expect(parseDecimalInput(formatDecimalInput(value, locale, 'EUR'), locale)).toBe(expected)
    }
  })
})
