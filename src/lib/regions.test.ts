import { countryOptions, currencyOptions, withCurrent } from './regions'

describe('regions', () => {
  it('lists ISO 4217 currencies with localised names', () => {
    const options = currencyOptions('es')
    expect(options.find((option) => option.value === 'MXN')?.label).toBe('MXN · peso mexicano')
    expect(currencyOptions('en').find((option) => option.value === 'EUR')?.label).toBe('EUR · Euro')
    expect(options.length).toBeGreaterThan(100)
  })

  it('lists countries by localised name and leaves out non-countries', () => {
    const options = countryOptions('es')
    expect(options.find((option) => option.value === 'MX')?.label).toBe('México')
    expect(options.some((option) => option.value === 'EU')).toBe(false)
    const labels = options.map((option) => option.label)
    expect(labels).toEqual([...labels].sort((a, b) => a.localeCompare(b, 'es')))
  })

  it('caches per locale', () => {
    expect(currencyOptions('es')).toBe(currencyOptions('es'))
  })

  it('keeps an unknown current value selectable', () => {
    const options = [{ value: 'EUR', label: 'EUR · Euro' }]
    expect(withCurrent(options, 'EURO')[0]).toEqual({ value: 'EURO', label: 'EURO' })
    expect(withCurrent(options, 'EUR')).toBe(options)
    expect(withCurrent(options, '')).toBe(options)
  })
})
