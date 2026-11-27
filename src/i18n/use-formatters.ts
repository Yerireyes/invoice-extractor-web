import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { formatDate } from '@/lib/dates'
import { resolveIntlLocale } from '@/lib/locale'
import { formatMoney, formatPercent } from '@/lib/money'
import { FALLBACK_LANGUAGE } from '.'

/** Intl formatters bound to the active language (and the user's region when it matches). */
export function useFormatters() {
  const { i18n } = useTranslation()
  const language = i18n.resolvedLanguage ?? FALLBACK_LANGUAGE

  return useMemo(() => {
    const locale = resolveIntlLocale(language)
    return {
      locale,
      money: (
        value: string,
        currency: string,
        options?: { currencyDisplay?: 'symbol' | 'narrowSymbol' | 'code' },
      ) => formatMoney(value, currency, locale, options),
      date: (value: string, style?: Intl.DateTimeFormatOptions['dateStyle']) =>
        formatDate(value, locale, style),
      percent: (value: number | string, options?: { ratio?: boolean }) =>
        formatPercent(value, locale, options),
    }
  }, [language])
}
