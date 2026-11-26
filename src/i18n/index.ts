import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'
import en from './en.json'
import es from './es.json'

export const SUPPORTED_LANGUAGES = ['es', 'en'] as const
export type Language = (typeof SUPPORTED_LANGUAGES)[number]

/** Used when the browser language is neither Spanish nor English. */
export const FALLBACK_LANGUAGE: Language = 'en'

/** localStorage key for the user's explicit choice. */
export const LANGUAGE_STORAGE_KEY = 'invoice-extractor.language'

export const resources = {
  es: { translation: es },
  en: { translation: en },
} as const

export function isLanguage(value: unknown): value is Language {
  return SUPPORTED_LANGUAGES.includes(value as Language)
}

function syncDocumentLanguage(language: string) {
  document.documentElement.lang = language
}

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    supportedLngs: SUPPORTED_LANGUAGES,
    nonExplicitSupportedLngs: true, // es-MX → es, en-GB → en
    load: 'languageOnly',
    fallbackLng: FALLBACK_LANGUAGE,
    initAsync: false,
    interpolation: { escapeValue: false }, // React already escapes
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: LANGUAGE_STORAGE_KEY,
      caches: ['localStorage'],
    },
    react: { useSuspense: false },
  })

syncDocumentLanguage(i18n.resolvedLanguage ?? FALLBACK_LANGUAGE)
i18n.on('languageChanged', () => {
  syncDocumentLanguage(i18n.resolvedLanguage ?? FALLBACK_LANGUAGE)
})

export default i18n
