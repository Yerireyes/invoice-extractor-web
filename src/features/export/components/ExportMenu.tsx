import {
  CircleAlertIcon,
  DownloadIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  LoaderCircleIcon,
} from 'lucide-react'
import { useId, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { StatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import { NativeSelect } from '@/components/ui/native-select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { ExportLanguage } from '@/lib/api-models'
import { cn } from '@/lib/utils'
import { reviewStatus, useInvoicesStore, type BatchInvoice } from '@/store/invoices'
import type { ExportFormat } from '../api'
import { useExport } from '../hooks/use-export'

const LANGUAGES: readonly ExportLanguage[] = ['es', 'en']

const FORMATS: { value: ExportFormat; icon: typeof FileTextIcon; extension: string }[] = [
  { value: 'excel', icon: FileSpreadsheetIcon, extension: '.xlsx' },
  { value: 'pdf', icon: FileTextIcon, extension: '.pdf' },
]

const label = (entry: BatchInvoice) => entry.invoice.issuer.name ?? entry.fileName

/**
 * "Exportar" in the header of /review: a popover with the format, the file's language, what to
 * include and which invoices. Invoices with errors are exported only after an explicit
 * "export anyway", stated in the panel itself (no second dialog).
 */
export function ExportMenu() {
  const { t, i18n } = useTranslation()
  const invoices = useInvoicesStore((state) => state.invoices)
  const [open, setOpen] = useState(false)
  const [format, setFormat] = useState<ExportFormat>('excel')
  const [language, setLanguage] = useState<ExportLanguage>(() =>
    i18n.resolvedLanguage === 'en' ? 'en' : 'es',
  )
  const [includeLines, setIncludeLines] = useState(true)
  const [includeAlerts, setIncludeAlerts] = useState(true)
  const [scope, setScope] = useState<'all' | 'some'>('all')
  // Unchecked invoices; new invoices joining the batch start checked.
  const [excluded, setExcluded] = useState<ReadonlySet<string>>(new Set())
  const ids = useId()

  const exporting = useExport({
    onSuccess: () => {
      setOpen(false)
    },
  })

  if (invoices.length === 0) return null

  const chosen = scope === 'all' ? invoices : invoices.filter((entry) => !excluded.has(entry.id))
  const withErrors = chosen.filter((entry) => reviewStatus(entry) === 'invalid').length
  const busy = exporting.isPending

  const toggle = (id: string, checked: boolean) => {
    setExcluded((current) => {
      const next = new Set(current)
      if (checked) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const submit = () => {
    if (chosen.length === 0 || busy) return
    exporting.mutate({
      format,
      entries: chosen,
      options: { language, include_line_items: includeLines, include_alerts: includeAlerts },
    })
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" className="h-9 gap-2 px-3">
          <DownloadIcon aria-hidden="true" />
          <span className="sr-only sm:not-sr-only">{t('export.trigger')}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent aria-labelledby={`${ids}-title`} className="p-0">
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault()
            submit()
          }}
        >
          <div className="max-h-[min(36rem,calc(100dvh-6rem))] space-y-5 overflow-y-auto p-4">
            <h2 id={`${ids}-title`} className="text-sm font-semibold">
              {t('export.title')}
            </h2>

            <Group legend={t('export.format')}>
              <div className="grid grid-cols-2 gap-2">
                {FORMATS.map(({ value, icon: Icon, extension }) => (
                  <label
                    key={value}
                    className="flex cursor-pointer items-center gap-2.5 rounded-lg border bg-card px-3 py-2.5 text-sm transition-colors hover:border-input has-checked:border-primary has-checked:bg-accent has-checked:text-accent-foreground has-focus-visible:ring-3 has-focus-visible:ring-ring/50"
                  >
                    <input
                      type="radio"
                      name={`${ids}-format`}
                      value={value}
                      checked={format === value}
                      onChange={() => {
                        setFormat(value)
                      }}
                      className="sr-only"
                    />
                    <Icon aria-hidden="true" className="size-4 shrink-0" />
                    <span className="font-medium">{t(`export.formats.${value}`)}</span>
                    <span className="ml-auto font-mono text-xs text-muted-foreground">
                      {extension}
                    </span>
                  </label>
                ))}
              </div>
            </Group>

            <div>
              <label
                htmlFor={`${ids}-language`}
                className="mb-1.5 block text-[0.8125rem] text-muted-foreground"
              >
                {t('export.language')}
              </label>
              <NativeSelect
                id={`${ids}-language`}
                value={language}
                onChange={(event) => {
                  setLanguage(event.target.value === 'en' ? 'en' : 'es')
                }}
              >
                {LANGUAGES.map((code) => (
                  <option key={code} value={code}>
                    {t(`language.${code}`)}
                  </option>
                ))}
              </NativeSelect>
            </div>

            <Group legend={t('export.include')}>
              <div className="grid gap-1">
                <Check checked={includeLines} onChange={setIncludeLines}>
                  {t('export.includeLines')}
                </Check>
                <Check checked={includeAlerts} onChange={setIncludeAlerts}>
                  {t('export.includeAlerts')}
                </Check>
              </div>
            </Group>

            <Group legend={t('export.invoices')}>
              <div className="grid gap-1">
                <Choice
                  name={`${ids}-scope`}
                  checked={scope === 'all'}
                  onChange={() => {
                    setScope('all')
                  }}
                >
                  {t('export.scopeAll', { count: invoices.length })}
                </Choice>
                <Choice
                  name={`${ids}-scope`}
                  checked={scope === 'some'}
                  onChange={() => {
                    setScope('some')
                  }}
                >
                  {t('export.scopeSome')}
                </Choice>
              </div>
              {scope === 'some' && (
                <ul
                  aria-label={t('export.invoices')}
                  className="mt-2 max-h-48 divide-y overflow-y-auto rounded-lg border bg-card"
                >
                  {invoices.map((entry) => (
                    <li key={entry.id}>
                      <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 text-sm hover:bg-muted/60">
                        <input
                          type="checkbox"
                          checked={!excluded.has(entry.id)}
                          onChange={(event) => {
                            toggle(entry.id, event.target.checked)
                          }}
                          className="size-4 shrink-0 accent-primary"
                        />
                        <span className="min-w-0 flex-1 truncate">{label(entry)}</span>
                        <StatusBadge status={reviewStatus(entry)} />
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </Group>
          </div>

          <div className="space-y-3 border-t p-4">
            <div aria-live="polite" className="text-xs empty:hidden">
              {withErrors > 0 ? (
                <p className="flex items-start gap-1.5 text-destructive">
                  <CircleAlertIcon aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
                  {t('export.withErrors', { count: withErrors })}
                </p>
              ) : chosen.length === 0 ? (
                <p className="text-muted-foreground">{t('export.noneChosen')}</p>
              ) : null}
            </div>
            <Button
              type="submit"
              disabled={chosen.length === 0 || busy}
              variant={withErrors > 0 ? 'destructive' : 'default'}
              className="h-10 w-full gap-2"
            >
              {busy ? (
                <LoaderCircleIcon
                  aria-hidden="true"
                  className="animate-spin motion-reduce:animate-none"
                />
              ) : (
                <DownloadIcon aria-hidden="true" />
              )}
              {busy
                ? t('export.working')
                : withErrors > 0
                  ? t('export.anyway', { count: chosen.length })
                  : t('export.submit', { count: chosen.length })}
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  )
}

function Group({ legend, children }: { legend: string; children: ReactNode }) {
  return (
    // min-w-0: a fieldset is as wide as its content by default, which breaks truncation.
    <fieldset className="min-w-0">
      <legend className="mb-1.5 text-[0.8125rem] text-muted-foreground">{legend}</legend>
      {children}
    </fieldset>
  )
}

function Check({
  checked,
  onChange,
  children,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  children: ReactNode
}) {
  return (
    <label className="flex min-h-9 cursor-pointer items-center gap-2.5 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => {
          onChange(event.target.checked)
        }}
        className="size-4 shrink-0 accent-primary"
      />
      {children}
    </label>
  )
}

function Choice({
  name,
  checked,
  onChange,
  children,
}: {
  name: string
  checked: boolean
  onChange: () => void
  children: ReactNode
}) {
  return (
    <label className={cn('flex min-h-9 cursor-pointer items-center gap-2.5 text-sm')}>
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onChange}
        className="size-4 shrink-0 accent-primary"
      />
      {children}
    </label>
  )
}
