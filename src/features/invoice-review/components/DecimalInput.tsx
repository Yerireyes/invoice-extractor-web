import { useState, type ComponentProps } from 'react'
import { Input } from '@/components/ui/input'
import { useFormatters } from '@/i18n/use-formatters'
import { formatDecimalInput, parseDecimalInput } from '@/lib/money'
import { cn } from '@/lib/utils'

interface DecimalInputProps extends Omit<
  ComponentProps<'input'>,
  'value' | 'onChange' | 'defaultValue' | 'type'
> {
  /** The API's decimal string ('' when empty), or the raw text while it does not parse. */
  value: string
  onChange: (value: string) => void
  /** Pads to the currency's decimals; omit for quantities and rates. */
  currency?: string | null
  /** Short text inside the right edge, such as the currency code. */
  suffix?: string
}

/**
 * Number input for amounts, quantities and rates. Shows the value with the language's separators
 * and reads back what people type in either style ("1.234,50" or "1,234.50"); the form receives
 * the API's format as soon as the text parses, and the raw text (an error) while it does not.
 */
export function DecimalInput({
  value,
  onChange,
  onFocus,
  onBlur,
  currency = null,
  suffix,
  className,
  ...props
}: DecimalInputProps) {
  const { locale } = useFormatters()
  // What the person is typing; null when the field is not being edited (then the value is shown).
  const [draft, setDraft] = useState<string | null>(null)
  const shown = draft ?? formatDecimalInput(value, locale, currency)

  const input = (
    <Input
      {...props}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      spellCheck={false}
      value={shown}
      onFocus={(event) => {
        setDraft(shown)
        onFocus?.(event)
      }}
      onChange={(event) => {
        const text = event.target.value
        setDraft(text)
        onChange(parseDecimalInput(text, locale) ?? text)
      }}
      onBlur={(event) => {
        setDraft(null)
        onBlur?.(event)
      }}
      className={cn('text-right tabular-nums', suffix && 'pr-12', className)}
    />
  )

  if (!suffix) return input
  return (
    <div className="relative">
      {input}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-3 flex items-center font-mono text-xs text-muted-foreground"
      >
        {suffix}
      </span>
    </div>
  )
}
