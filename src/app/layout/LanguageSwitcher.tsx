import { LanguagesIcon } from 'lucide-react'
import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FALLBACK_LANGUAGE, isLanguage, SUPPORTED_LANGUAGES } from '@/i18n'

export function LanguageSwitcher() {
  const { t, i18n } = useTranslation()
  const labelId = useId()
  const current = i18n.resolvedLanguage ?? FALLBACK_LANGUAGE

  return (
    <div className="flex items-center">
      <span id={labelId} className="sr-only">
        {t('language.label')}
      </span>
      <Select
        value={current}
        onValueChange={(value) => {
          if (isLanguage(value)) void i18n.changeLanguage(value)
        }}
      >
        <SelectTrigger size="sm" aria-labelledby={labelId}>
          <LanguagesIcon aria-hidden="true" />
          {/* On phones the code alone ("ES") keeps the header on one line. */}
          <SelectValue>
            <span className="sm:hidden">{current.toUpperCase()}</span>
            <span className="hidden sm:inline">{t(`language.${current}`)}</span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent align="end">
          {SUPPORTED_LANGUAGES.map((language) => (
            <SelectItem key={language} value={language} lang={language}>
              {t(`language.${language}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
