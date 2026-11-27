import { ChevronLeftIcon, ChevronRightIcon, UploadIcon } from 'lucide-react'
import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { NativeSelect } from '@/components/ui/native-select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useMediaQuery } from '@/lib/use-media-query'
import { reviewStatus } from '@/store/invoices'
import { useLiveValidation } from '../hooks/use-live-validation'
import { useActiveInvoice } from '../hooks/use-active-invoice'
import { issuerLabel } from '../lib/labels'
import { BatchList } from './BatchList'
import { InvoicePanel } from './InvoicePanel'
import { InvoiceViewer } from './InvoiceViewer'

/** Desktop layout breakpoint (Tailwind `lg`). */
const DESKTOP = '(min-width: 1024px)'

export function ReviewPage() {
  const { t } = useTranslation()
  const isDesktop = useMediaQuery(DESKTOP)
  const { invoices, active, index, select, previous, next } = useActiveInvoice()
  useLiveValidation()

  if (!active) return <EmptyReview />

  const panel = (showNavigation: boolean) => (
    <InvoicePanel
      showNavigation={showNavigation}
      entry={active}
      index={index}
      total={invoices.length}
      onPrevious={
        previous
          ? () => {
              select(previous.id)
            }
          : undefined
      }
      onNext={
        next
          ? () => {
              select(next.id)
            }
          : undefined
      }
      className="h-full"
    />
  )

  return (
    <>
      <h1 className="sr-only">{t('review.pageTitle')}</h1>
      {isDesktop ? (
        <div className="grid h-[calc(100dvh-4rem)] grid-cols-[16.5rem_minmax(0,1fr)_minmax(27rem,36rem)]">
          <div className="min-h-0 border-r">
            <BatchList invoices={invoices} activeId={active.id} onSelect={select} />
          </div>
          <InvoiceViewer key={active.id} entry={active} className="min-h-0 border-r" />
          {panel(true)}
        </div>
      ) : (
        <div className="flex flex-col">
          <MobilePicker
            invoices={invoices}
            activeId={active.id}
            onSelect={select}
            onPrevious={
              previous
                ? () => {
                    select(previous.id)
                  }
                : undefined
            }
            onNext={
              next
                ? () => {
                    select(next.id)
                  }
                : undefined
            }
          />
          <Tabs defaultValue="data" className="gap-0">
            <TabsList
              aria-label={t('review.tabs.label')}
              className="mx-4 mt-3 grid w-auto grid-cols-2"
            >
              <TabsTrigger value="image">{t('review.tabs.image')}</TabsTrigger>
              <TabsTrigger value="data">{t('review.tabs.data')}</TabsTrigger>
            </TabsList>
            <TabsContent value="image" className="mt-3 min-h-[70dvh]">
              <InvoiceViewer key={active.id} entry={active} className="h-[75dvh] border-y" />
            </TabsContent>
            <TabsContent value="data" className="mt-3 border-t">
              {panel(false)}
            </TabsContent>
          </Tabs>
        </div>
      )}
    </>
  )
}

function MobilePicker({
  invoices,
  activeId,
  onSelect,
  onPrevious,
  onNext,
}: {
  invoices: ReturnType<typeof useActiveInvoice>['invoices']
  activeId: string
  onSelect: (id: string) => void
  onPrevious?: () => void
  onNext?: () => void
}) {
  const { t } = useTranslation()
  const id = useId()
  return (
    <div className="flex items-end gap-2 border-b px-4 py-3">
      <div className="min-w-0 flex-1">
        <label htmlFor={id} className="mb-1.5 block text-[0.8125rem] text-muted-foreground">
          {t('review.panel.picker')}
        </label>
        <NativeSelect
          id={id}
          value={activeId}
          onChange={(event) => {
            onSelect(event.target.value)
          }}
        >
          {invoices.map((entry, index) => (
            <option key={entry.id} value={entry.id}>
              {`${String(index + 1)}. ${issuerLabel(t, entry)} · ${t(`validationStatus.${reviewStatus(entry)}`)}`}
            </option>
          ))}
        </NativeSelect>
      </div>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-10 bg-card"
        onClick={onPrevious}
        disabled={!onPrevious}
        aria-label={t('review.panel.previous')}
      >
        <ChevronLeftIcon aria-hidden="true" />
      </Button>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-10 bg-card"
        onClick={onNext}
        disabled={!onNext}
        aria-label={t('review.panel.next')}
      >
        <ChevronRightIcon aria-hidden="true" />
      </Button>
    </div>
  )
}

function EmptyReview() {
  const { t } = useTranslation()
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
      <h1 className="text-xl font-medium tracking-tight text-balance">{t('review.empty.title')}</h1>
      <p className="mt-2 text-muted-foreground">{t('review.empty.body')}</p>
      <Button asChild size="lg" className="mt-6 h-11 gap-2 px-5">
        <Link to="/">
          <UploadIcon aria-hidden="true" />
          {t('review.empty.action')}
        </Link>
      </Button>
    </div>
  )
}
