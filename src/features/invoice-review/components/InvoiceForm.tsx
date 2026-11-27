import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, type ReactNode } from 'react'
import { useForm, useWatch, type FieldPath } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { Textarea } from '@/components/ui/textarea'
import { useFormatters } from '@/i18n/use-formatters'
import { countryOptions, currencyOptions, withCurrent } from '@/lib/regions'
import { needsCheck, useInvoicesStore, type BatchInvoice } from '@/store/invoices'
import {
  applyFormValues,
  DOCUMENT_TYPES,
  generalSchema,
  LONG_TEXT_MAX,
  SHORT_TEXT_MAX,
  toFormValues,
  type GeneralFormValues,
} from '../schema'
import { Field } from './Field'

type FieldName = FieldPath<GeneralFormValues>

/**
 * General data of one invoice. Edits go straight to the batch store (the source of truth for
 * validation and export); remount it with `key={entry.id}` when the active invoice changes.
 */
export function InvoiceForm({ entry }: { entry: BatchInvoice }) {
  const { t } = useTranslation()
  const { locale } = useFormatters()
  const form = useForm<GeneralFormValues>({
    defaultValues: toFormValues(entry.invoice),
    resolver: zodResolver(generalSchema),
    mode: 'onChange',
  })
  const { register, formState, control } = form

  useEffect(() => {
    return form.subscribe({
      formState: { values: true },
      callback: ({ values, name, type }) => {
        if (!name || type !== 'change') return
        const store = useInvoicesStore.getState()
        const current = store.invoices.find((invoice) => invoice.id === entry.id)
        if (!current) return
        store.updateInvoice(entry.id, applyFormValues(current.invoice, values))
        // Editing a doubtful field is the user checking it.
        if (needsCheck(current, name)) store.confirmField(entry.id, name)
      },
    })
  }, [entry.id, form])

  const unsure = (name: FieldName) =>
    needsCheck(entry, name) ? entry.fieldConfidence[name] : undefined
  const confirm = (name: FieldName) => () => {
    useInvoicesStore.getState().confirmField(entry.id, name)
  }
  const errorOf = (name: FieldName): string | undefined => {
    const [first, second] = name.split('.') as [keyof GeneralFormValues, string | undefined]
    const node = formState.errors[first] as { message?: string; [key: string]: unknown } | undefined
    if (!node) return undefined
    if (!second) return node.message
    return (node[second] as { message?: string } | undefined)?.message
  }
  const fieldProps = (name: FieldName, label: string) => ({
    label,
    error: errorOf(name),
    lowConfidence: unsure(name),
    onConfirm: confirm(name),
  })

  const [currency, country, issuerIdType, recipientIdType] = useWatch({
    control,
    name: ['currency', 'country', 'issuer.tax_id_type', 'recipient.tax_id_type'],
  })

  const party = (prefix: 'issuer' | 'recipient', idType: string) => (
    <div className="grid gap-4 sm:grid-cols-6">
      <Field {...fieldProps(`${prefix}.name`, t('review.party.name'))} className="sm:col-span-6">
        <Input {...register(`${prefix}.name`)} maxLength={SHORT_TEXT_MAX} autoComplete="off" />
      </Field>
      <Field
        {...fieldProps(`${prefix}.tax_id`, t('review.party.tax_id'))}
        hint={idType || undefined}
        className="sm:col-span-4"
      >
        <Input
          {...register(`${prefix}.tax_id`)}
          maxLength={SHORT_TEXT_MAX}
          autoComplete="off"
          spellCheck={false}
          className="font-mono"
        />
      </Field>
      <Field
        {...fieldProps(`${prefix}.tax_id_type`, t('review.party.tax_id_type'))}
        className="sm:col-span-2"
      >
        <Input
          {...register(`${prefix}.tax_id_type`)}
          maxLength={SHORT_TEXT_MAX}
          autoComplete="off"
        />
      </Field>
      <Field
        {...fieldProps(`${prefix}.address`, t('review.party.address'))}
        className="sm:col-span-6"
      >
        <Textarea {...register(`${prefix}.address`)} maxLength={LONG_TEXT_MAX} rows={2} />
      </Field>
      <Field {...fieldProps(`${prefix}.email`, t('review.party.email'))} className="sm:col-span-3">
        <Input
          {...register(`${prefix}.email`)}
          type="email"
          maxLength={SHORT_TEXT_MAX}
          autoComplete="off"
        />
      </Field>
      <Field {...fieldProps(`${prefix}.phone`, t('review.party.phone'))} className="sm:col-span-3">
        <Input
          {...register(`${prefix}.phone`)}
          type="tel"
          maxLength={SHORT_TEXT_MAX}
          autoComplete="off"
        />
      </Field>
    </div>
  )

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
      }}
      className="divide-y"
    >
      <Section title={t('review.sections.general')}>
        {/* Pairs that belong together: type/number, issue/due date, currency/country. */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field {...fieldProps('document_type', t('fields.document_type'))}>
            <NativeSelect {...register('document_type')}>
              {DOCUMENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {t(`documentType.${type}`)}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field {...fieldProps('invoice_number', t('fields.invoice_number'))}>
            <Input
              {...register('invoice_number')}
              maxLength={SHORT_TEXT_MAX}
              autoComplete="off"
              spellCheck={false}
              className="font-mono"
            />
          </Field>
          <Field {...fieldProps('issue_date', t('fields.issue_date'))}>
            <Input {...register('issue_date')} type="date" required />
          </Field>
          <Field {...fieldProps('due_date', t('fields.due_date'))}>
            <Input {...register('due_date')} type="date" />
          </Field>
          <Field {...fieldProps('currency', t('fields.currency'))}>
            <NativeSelect {...register('currency')} required>
              <option value="">{t('review.select.currency')}</option>
              {withCurrent(currencyOptions(locale), currency).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field {...fieldProps('country', t('fields.country'))}>
            <NativeSelect {...register('country')}>
              <option value="">{t('review.select.country')}</option>
              {withCurrent(countryOptions(locale), country.toUpperCase()).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </NativeSelect>
          </Field>
        </div>
      </Section>

      <Section title={t('review.sections.issuer')}>{party('issuer', issuerIdType)}</Section>
      <Section title={t('review.sections.recipient')}>
        {party('recipient', recipientIdType)}
      </Section>

      <Section title={t('review.sections.payment')}>
        <div className="grid gap-4">
          <Field {...fieldProps('payment_method', t('fields.payment_method'))}>
            <Input {...register('payment_method')} maxLength={SHORT_TEXT_MAX} autoComplete="off" />
          </Field>
          <Field {...fieldProps('notes', t('fields.notes'))}>
            <Textarea {...register('notes')} maxLength={LONG_TEXT_MAX} rows={3} />
          </Field>
        </div>
      </Section>
    </form>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="px-5 py-6 sm:px-7">
      <legend className="float-left mb-4 w-full text-sm font-semibold">{title}</legend>
      <div className="clear-both">{children}</div>
    </fieldset>
  )
}
