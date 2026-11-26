/**
 * Picks the best Intl locale for an app language, keeping the user's region when it matches:
 * app "es" + browser "es-MX" → "es-MX" (Mexican number/date formats); otherwise just "es".
 */
export function resolveIntlLocale(
  language: string,
  browserLanguages: readonly string[] = typeof navigator === 'undefined' ? [] : navigator.languages,
): string {
  const regional = browserLanguages.find(
    (candidate) => candidate.toLowerCase().split('-')[0] === language.toLowerCase(),
  )
  return regional ?? language
}
