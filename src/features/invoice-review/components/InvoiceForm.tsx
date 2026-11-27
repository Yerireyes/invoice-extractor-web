import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, type ReactNode } from 'react'
import { Controller, useForm, useWatch, type FieldPath } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { Textarea } from '@/components/ui/textarea'
import { useFormatters } from '@/i18n/use-formatters'
import { cn } from '@/lib/utils'
import { countryOptions, currencyOptions, withCurrent } from '@/lib/regions'
import { needsCheck, useInvoicesStore, type BatchInvoice } from '@/store/invoices'
import {
  applyFormValues,
  DOCUMENT_TYPES,
  emptyLineItem,
  emptyTax,
  invoiceFormSchema,
  LONG_TEXT_MAX,
  SHORT_TEXT_MAX,
  toFormValues,
  type InvoiceFormValues,
} from '../schema'
import { DecimalInput } from './DecimalInput'
import { Field } from './Field'
import { RowsEditor, type RowColumn } from './RowsEditor'

type FieldName = FieldPath<InvoiceFormValues>

/** Writes the form to the batch store; returns the entry as it was before the write. */
function saveForm(id: string, values: InvoiceFormValues) {
  const store = useInvoicesStore.getState()
  const current = store.invoices.find((invoice) => invoice.id === id)
  if (current) store.updateInvoice(id, applyFormValues(current.invoice, values))
  return current
}

/**
 * Data of one invoice. Edits go straight to the batch store (the source of truth for
 * validation and export); remount it with `key={entry.id}` when the active invoice changes.
 */
export function InvoiceForm({ entry }: { entry: BatchInvoice }) {
  const { t } = useTranslation()
  const { locale } = useFormatters()
  const form = useForm<InvoiceFormValues>({
    defaultValues: toFormValues(entry.invoice),
    resolver: zodResolver(invoiceFormSchema),
    mode: 'onChange',
  })
  const { register, formState, control } = form

  useEffect(() => {
    return form.subscribe({
      formState: { values: true },
      callback: ({ values, name, type }) => {
        if (!name || type !== 'change') return
        const previous = saveForm(entry.id, values)
        // Editing a doubtful field is the user checking it.
        if (previous && needsCheck(previous, name)) {
          useInvoicesStore.getState().confirmField(entry.id, name)
        }
      },
    })
  }, [entry.id, form])

  const unsure = (name: FieldName) =>
    needsCheck(entry, name) ? entry.fieldConfidence[name] : undefined
  const confirm = (name: FieldName) => () => {
    useInvoicesStore.getState().confirmField(entry.id, name)
  }
  const errorOf = (name: FieldName) => form.getFieldState(name, formState).error?.message
  const fieldProps = (name: FieldName, label: string) => ({
    label,
    error: errorOf(name),
    lowConfidence: unsure(name),
    onConfirm: confirm(name),
  })

  const [currency, country, issuerIdType, recipientIdType, lines, taxes] = useWatch({
    control,
    name: [
      'currency',
      'country',
      'issuer.tax_id_type',
      'recipient.tax_id_type',
      'line_items',
      'taxes',
    ],
  })
  const currencyCode = currency.trim() === '' ? null : currency.trim().toUpperCase()

  const lineColumns: RowColumn[] = [
    {
      key: 'description',
      header: t('review.lines.columns.description'),
      label: t('fields.line_items.description'),
      kind: 'longText',
      card: 'col-span-5 col-start-1 row-start-1',
    },
    {
      key: 'quantity',
      header: t('review.lines.columns.quantity'),
      label: t('fields.line_items.quantity'),
      kind: 'decimal',
      width: 'w-12',
      card: 'col-span-2',
    },
    {
      key: 'unit_price',
      header: t('review.lines.columns.unit_price'),
      label: t('fields.line_items.unit_price'),
      kind: 'money',
      width: 'w-[5.25rem]',
      card: 'col-span-2',
    },
    {
      key: 'discount',
      header: t('review.lines.columns.discount'),
      label: t('fields.line_items.discount'),
      kind: 'money',
      width: 'w-[4.5rem]',
      card: 'col-span-2',
    },
    {
      key: 'tax_rate',
      header: t('review.lines.columns.tax_rate'),
      label: t('fields.line_items.tax_rate'),
      kind: 'decimal',
      width: 'w-14',
      card: 'col-span-2',
    },
    {
      key: 'amount',
      header: t('review.lines.columns.amount'),
      label: t('fields.line_items.amount'),
      kind: 'money',
      width: 'w-[5.5rem]',
      card: 'col-span-4',
    },
  ]

  const taxColumns: RowColumn[] = [
    {
      key: 'name',
      header: t('review.taxes.columns.name'),
      label: t('fields.taxes.name'),
      kind: 'text',
      card: 'col-span-5 col-start-1 row-start-1',
    },
    {
      key: 'rate',
      header: t('review.taxes.columns.rate'),
      label: t('fields.taxes.rate'),
      kind: 'decimal',
      width: 'w-16',
      card: 'col-span-2',
    },
    {
      key: 'base',
      header: t('review.taxes.columns.base'),
      label: t('fields.taxes.base'),
      kind: 'money',
      width: 'w-[6.5rem]',
      card: 'col-span-2',
    },
    {
      key: 'amount',
      header: t('review.taxes.columns.amount'),
      label: t('fields.taxes.amount'),
      kind: 'money',
      width: 'w-[6.5rem]',
      card: 'col-span-2',
    },
  ]

  const onRowsChange = () => {
    saveForm(entry.id, form.getValues())
  }

  const amountField = (name: 'subtotal' | 'discount_total' | 'total', emphasis = false) => (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Field {...fieldProps(name, t(`fields.${name}`))} inline>
          <DecimalInput
            ref={field.ref}
            name={field.name}
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            currency={currencyCode}
            suffix={emphasis ? (currencyCode ?? undefined) : undefined}
            className={cn('w-40 sm:w-44', emphasis && 'h-11 text-base font-medium md:text-base')}
          />
        </Field>
      )}
    />
  )

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

      <Section
        title={t('review.sections.lines')}
        aside={t('review.lines.count', { count: lines.length })}
      >
        <RowsEditor
          list="line_items"
          form={form}
          entry={entry}
          columns={lineColumns}
          currency={currencyCode}
          emptyRow={emptyLineItem}
          onRowsChange={onRowsChange}
          text={{
            caption: t('review.sections.lines'),
            add: t('review.lines.add'),
            empty: t('review.lines.empty'),
            remove: (number) => t('review.lines.remove', { number }),
            fieldLabel: (label, number) => t('fields.lineSuffix', { label, number }),
          }}
        />
      </Section>

      <Section
        title={t('review.sections.taxes')}
        aside={taxes.length > 0 ? t('review.taxes.count', { count: taxes.length }) : undefined}
      >
        <RowsEditor
          list="taxes"
          form={form}
          entry={entry}
          columns={taxColumns}
          currency={currencyCode}
          emptyRow={emptyTax}
          onRowsChange={onRowsChange}
          text={{
            caption: t('review.sections.taxes'),
            add: t('review.taxes.add'),
            empty: t('review.taxes.empty'),
            remove: (number) => t('review.taxes.remove', { number }),
            fieldLabel: (label, number) => t('fields.taxSuffix', { label, number }),
          }}
        />
      </Section>

      <Section title={t('review.sections.totals')}>
        <div className="ml-auto grid max-w-sm gap-3">
          {amountField('subtotal')}
          {amountField('discount_total')}
          <div className="border-t pt-3">{amountField('total', true)}</div>
        </div>
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

function Section({
  title,
  aside,
  children,
}: {
  title: string
  /** Quiet detail at the right of the title, such as a count. */
  aside?: string
  children: ReactNode
}) {
  return (
    <fieldset className="px-5 py-6 sm:px-7">
      <legend className="float-left mb-4 flex w-full items-baseline justify-between gap-4 text-sm font-semibold">
        {title}
        {aside && (
          <span className="text-xs font-normal text-muted-foreground tabular-nums">{aside}</span>
        )}
      </legend>
      <div className="clear-both">{children}</div>
    </fieldset>
  )
}
