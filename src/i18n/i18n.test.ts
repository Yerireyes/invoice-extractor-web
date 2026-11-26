import { CLIENT_CODES, FILE_ERROR_CODES, HTTP_ERROR_CODES, ISSUE_CODES } from './codes'
import en from './en.json'
import es from './es.json'
import i18n, { isLanguage, LANGUAGE_STORAGE_KEY, resources, SUPPORTED_LANGUAGES } from '.'

interface Tree {
  [key: string]: string | Tree
}

/** Flattens nested keys: { a: { b: 'x' } } → { 'a.b': 'x' }. */
function flatten(tree: Tree, prefix = ''): Record<string, string> {
  return Object.entries(tree).reduce<Record<string, string>>((acc, [key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key
    return typeof value === 'string'
      ? { ...acc, [path]: value }
      : { ...acc, ...flatten(value, path) }
  }, {})
}

const placeholders = (text: string) => [...text.matchAll(/{{\s*(\w+)/g)].map((m) => m[1]).sort()

const catalogs = { es: flatten(es), en: flatten(en) }

describe('translation catalogs', () => {
  it('have exactly the same keys in every language', () => {
    const esKeys = Object.keys(catalogs.es).sort()
    const enKeys = Object.keys(catalogs.en).sort()

    expect(
      esKeys.filter((key) => !enKeys.includes(key)),
      'missing in en.json',
    ).toEqual([])
    expect(
      enKeys.filter((key) => !esKeys.includes(key)),
      'missing in es.json',
    ).toEqual([])
  })

  it('use the same interpolation variables in every language', () => {
    const mismatches = Object.keys(catalogs.es).filter(
      (key) =>
        JSON.stringify(placeholders(catalogs.es[key] ?? '')) !==
        JSON.stringify(placeholders(catalogs.en[key] ?? '')),
    )
    expect(mismatches).toEqual([])
  })

  it('have no empty translations', () => {
    for (const [language, catalog] of Object.entries(catalogs)) {
      const empty = Object.entries(catalog).filter(([, text]) => text.trim() === '')
      expect(empty, language).toEqual([])
    }
  })

  it.each(SUPPORTED_LANGUAGES)('translate every contract code in %s', (language) => {
    const catalog = catalogs[language]
    const expected = [
      ...[...HTTP_ERROR_CODES, ...CLIENT_CODES, 'generic'].map((code) => `errors.${code}`),
      ...[...FILE_ERROR_CODES, 'generic'].map((code) => `fileErrors.${code}`),
      ...[...ISSUE_CODES, 'generic'].map((code) => `issues.${code}`),
    ]
    expect(expected.filter((key) => !(key in catalog))).toEqual([])
  })

  it('registers every supported language as a resource', () => {
    expect(Object.keys(resources).sort()).toEqual([...SUPPORTED_LANGUAGES].sort())
  })
})

describe('i18n instance', () => {
  it('recognises supported languages only', () => {
    expect(isLanguage('es')).toBe(true)
    expect(isLanguage('en')).toBe(true)
    expect(isLanguage('fr')).toBe(false)
    expect(isLanguage(undefined)).toBe(false)
  })

  it('maps regional variants to the base language', async () => {
    await i18n.changeLanguage('es-MX')
    expect(i18n.resolvedLanguage).toBe('es')
    await i18n.changeLanguage('en-GB')
    expect(i18n.resolvedLanguage).toBe('en')
  })

  it('falls back to English for unsupported languages', async () => {
    await i18n.changeLanguage('fr')
    expect(i18n.t('language.label')).toBe('Language')
  })

  it('keeps <html lang> in sync and remembers the choice', async () => {
    await i18n.changeLanguage('en')
    expect(document.documentElement.lang).toBe('en')
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('en')

    await i18n.changeLanguage('es')
    expect(document.documentElement.lang).toBe('es')
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('es')
  })
})
