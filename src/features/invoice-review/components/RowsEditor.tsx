import { createColumnHelper, tableFeatures, useTable } from '@tanstack/react-table'
import { CheckIcon, CircleAlertIcon, PlusIcon, TriangleAlertIcon, XIcon } from 'lucide-react'
import { useRef, type ReactNode } from 'react'
import { Controller, useFieldArray, type FieldPath, type UseFormReturn } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useFormatters } from '@/i18n/use-formatters'
import { cn } from '@/lib/utils'
import { needsCheck, useInvoicesStore, type BatchInvoice } from '@/store/invoices'
import { LONG_TEXT_MAX, SHORT_TEXT_MAX, type InvoiceFormValues } from '../schema'
import { DecimalInput } from './DecimalInput'

type ListName = 'line_items' | 'taxes'
type FieldName = FieldPath<InvoiceFormValues>

// TanStack Table keeps the row and column model (stable row ids from the field array); the
// markup, inputs and accessibility are ours.
const features = tableFeatures({})
const columnHelper = createColumnHelper<typeof features, { id: string }>()

export interface RowColumn {
  key: string
  /** Column header, and the visible label of the field in the stacked (card) layout. */
  header: string
  /** Full name of the field, completed with the row number for its accessible label. */
  label: string
  kind: 'text' | 'longText' | 'decimal' | 'money'
  /** Width of the table column (the column without one takes the remaining space). */
  width?: string
  /** Placement in the 6-column card layout used on narrow containers. */
  card: string
}

interface RowsEditorProps {
  list: ListName
  form: UseFormReturn<InvoiceFormValues>
  entry: BatchInvoice
  columns: RowColumn[]
  currency: string | null
  emptyRow: () => InvoiceFormValues[ListName][number]
  /** Writes the form to the batch store after a row is added or removed. */
  onRowsChange: () => void
  text: {
    caption: string
    add: string
    empty: string
    remove: (number: number) => string
    /** "Importe (concepto 2)": the field label for the row's number. */
    fieldLabel: (label: string, number: number) => string
  }
}

/**
 * Editable rows (line items, taxes). A table with borderless, spreadsheet-like cells when the
 * container is wide enough; stacked cards with visible labels when it is not. Each row's errors and
 * the AI's doubts are listed under it, linked to their inputs, with the "it's correct" action.
 */
export function RowsEditor({
  list,
  form,
  entry,
  columns,
  currency,
  emptyRow,
  onRowsChange,
  text,
}: RowsEditorProps) {
  const { t } = useTranslation()
  const { percent } = useFormatters()
  const { control, register, formState, getFieldState } = form
  const { fields, append, remove } = useFieldArray({ control, name: list })
  const bodyRef = useRef<HTMLTableElement>(null)
  const addRef = useRef<HTMLButtonElement>(null)

  const path = (index: number, key: string) => `${list}.${String(index)}.${key}` as FieldName
  const errorOf = (name: FieldName) => getFieldState(name, formState).error?.message
  const unsureOf = (name: FieldName) =>
    needsCheck(entry, name) ? entry.fieldConfidence[name] : undefined
  const noteId = (rowId: string, key: string) => `${rowId}-${key}-note`

  const removeRow = (index: number) => {
    remove(index)
    useInvoicesStore.getState().removeListPaths(entry.id, list, index)
    onRowsChange()
    // Keep keyboard users in place: the next row's remove button, else the add button.
    requestAnimationFrame(() => {
      const buttons = bodyRef.current?.querySelectorAll<HTMLButtonElement>('[data-remove-row]')
      const next = buttons?.[Math.min(index, buttons.length - 1)]
      ;(next ?? addRef.current)?.focus()
    })
  }

  const renderInput = (index: number, rowId: string, column: RowColumn) => {
    const name = path(index, column.key)
    const error = errorOf(name)
    const unsure = unsureOf(name) !== undefined
    const label = text.fieldLabel(column.label, index + 1)
    const shared = {
      'aria-label': label,
      'aria-invalid': error ? true : undefined,
      'aria-describedby': error || unsure ? noteId(rowId, column.key) : undefined,
      className: cn(
        'h-9 px-2',
        // Spreadsheet cells in the table: the edge shows on hover and focus only.
        !error &&
          !unsure &&
          '@min-[30rem]/rows:border-transparent @min-[30rem]/rows:bg-transparent @min-[30rem]/rows:hover:border-input @min-[30rem]/rows:dark:bg-transparent',
        unsure && !error && 'border-warning/70 bg-warning-surface dark:bg-warning-surface',
      ),
    }

    if (column.kind === 'decimal' || column.kind === 'money') {
      return (
        <Controller
          control={control}
          name={name}
          render={({ field }) => (
            <DecimalInput
              {...shared}
              ref={field.ref}
              name={field.name}
              value={typeof field.value === 'string' ? field.value : ''}
              onChange={field.onChange}
              onBlur={field.onBlur}
              currency={column.kind === 'money' ? currency : null}
            />
          )}
        />
      )
    }
    if (column.kind === 'longText') {
      return (
        <Textarea
          {...register(name)}
          {...shared}
          rows={1}
          maxLength={LONG_TEXT_MAX}
          className={cn(shared.className, 'h-auto min-h-9 resize-none py-1.5')}
        />
      )
    }
    return <Input {...register(name)} {...shared} maxLength={SHORT_TEXT_MAX} autoComplete="off" />
  }

  const byKey = new Map(columns.map((column) => [column.key, column]))
  const specOf = (id: string) => {
    const column = byKey.get(id)
    if (!column) throw new Error(`Unknown column ${id}`)
    return column
  }
  const table = useTable({
    features,
    columns: columns.map((column) => columnHelper.display({ id: column.key })),
    data: fields,
    getRowId: (row) => row.id,
  })

  const numeric = (column: RowColumn) => column.kind === 'decimal' || column.kind === 'money'

  return (
    <div className="@container/rows">
      {fields.length === 0 ? (
        <p className="text-sm text-muted-foreground">{text.empty}</p>
      ) : (
        <table ref={bodyRef} className="w-full border-collapse @min-[30rem]/rows:table-fixed">
          <caption className="sr-only">{text.caption}</caption>
          <thead className="hidden @min-[30rem]/rows:table-header-group">
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id} className="border-b">
                {group.headers.map((header) => {
                  const column = specOf(header.column.id)
                  return (
                    <th
                      key={header.id}
                      scope="col"
                      className={cn(
                        'px-2 pb-2 text-xs font-normal text-muted-foreground',
                        numeric(column) ? 'text-right' : 'text-left',
                        column.width,
                      )}
                    >
                      {column.header}
                    </th>
                  )
                })}
                <th scope="col" className="w-9">
                  <span className="sr-only">{t('review.rows.actions')}</span>
                </th>
              </tr>
            ))}
          </thead>
          {table.getRowModel().rows.map((row) => {
            const notes: ReactNode[] = []
            for (const column of columns) {
              const name = path(row.index, column.key)
              const label = text.fieldLabel(column.label, row.index + 1)
              const error = errorOf(name)
              const confidence = unsureOf(name)
              if (error) {
                notes.push(
                  <p
                    key={column.key}
                    id={noteId(row.id, column.key)}
                    className="flex items-start gap-1.5 text-destructive"
                  >
                    <CircleAlertIcon aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
                    <span>
                      {t('review.rows.note', { field: column.header, message: t(error) })}
                    </span>
                  </p>,
                )
              } else if (confidence !== undefined) {
                notes.push(
                  <div
                    key={column.key}
                    className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5"
                  >
                    <p
                      id={noteId(row.id, column.key)}
                      className="flex items-start gap-1.5 text-warning"
                    >
                      <TriangleAlertIcon aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
                      <span>
                        {t('review.rows.note', {
                          field: column.header,
                          message: t('review.confidence.hint', {
                            percent: percent(confidence, { ratio: true }),
                          }),
                        })}
                      </span>
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        useInvoicesStore.getState().confirmField(entry.id, name)
                      }}
                      aria-label={t('review.confidence.confirmLabel', { field: label })}
                      className="gap-1.5 bg-card"
                    >
                      <CheckIcon aria-hidden="true" />
                      {t('review.confidence.confirm')}
                    </Button>
                  </div>,
                )
              }
            }

            return (
              <tbody
                key={row.id}
                className="block border-b py-3 @min-[30rem]/rows:table-row-group @min-[30rem]/rows:py-0"
              >
                <tr className="grid grid-cols-6 items-end gap-x-2 gap-y-3 @min-[30rem]/rows:table-row">
                  {row.getAllCells().map((cell) => {
                    const column = specOf(cell.column.id)
                    return (
                      <td
                        key={cell.id}
                        className={cn(
                          'min-w-0 align-top @min-[30rem]/rows:px-0.5 @min-[30rem]/rows:py-1.5',
                          column.card,
                        )}
                      >
                        <span
                          aria-hidden="true"
                          className={cn(
                            'mb-1 block text-xs text-muted-foreground @min-[30rem]/rows:hidden',
                            numeric(column) && 'text-right',
                          )}
                        >
                          {column.header}
                        </span>
                        {renderInput(row.index, row.id, column)}
                      </td>
                    )
                  })}
                  <td className="col-start-6 row-start-1 flex justify-end self-start @min-[30rem]/rows:table-cell @min-[30rem]/rows:py-1.5 @min-[30rem]/rows:align-top">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      data-remove-row=""
                      onClick={() => {
                        removeRow(row.index)
                      }}
                      aria-label={text.remove(row.index + 1)}
                      className="size-9 text-muted-foreground hover:text-foreground"
                    >
                      <XIcon aria-hidden="true" />
                    </Button>
                  </td>
                </tr>
                {notes.length > 0 && (
                  <tr className="block @min-[30rem]/rows:table-row">
                    <td
                      colSpan={columns.length + 1}
                      className="block pt-3 text-xs @min-[30rem]/rows:table-cell @min-[30rem]/rows:px-2 @min-[30rem]/rows:pt-0 @min-[30rem]/rows:pb-3"
                    >
                      <div className="grid gap-2">{notes}</div>
                    </td>
                  </tr>
                )}
              </tbody>
            )
          })}
        </table>
      )}

      <Button
        ref={addRef}
        type="button"
        variant="ghost"
        onClick={() => {
          append(emptyRow())
          onRowsChange()
        }}
        className="mt-3 -ml-2 h-9 gap-1.5 px-2 text-primary hover:text-primary"
      >
        <PlusIcon aria-hidden="true" />
        {text.add}
      </Button>
    </div>
  )
}
