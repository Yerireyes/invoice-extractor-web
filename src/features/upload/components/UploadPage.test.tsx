import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { Providers } from '@/app/providers'
import { routes } from '@/app/router'
import i18n from '@/i18n'
import { meta } from '@/mocks/fixtures/meta'
import { server } from '@/mocks/node'
import { useSelectionStore } from '../selection-store'

function renderUpload() {
  render(
    <Providers>
      <RouterProvider router={createMemoryRouter(routes, { initialEntries: ['/'] })} />
    </Providers>,
  )
  // applyAccept: false lets the test drop unsupported files the way a real drag can.
  return userEvent.setup({ applyAccept: false })
}

const fileInput = () => {
  const input = document.querySelector<HTMLInputElement>('input[type=file]')
  if (!input) throw new Error('file input not found')
  return input
}

const fileList = () => screen.getByRole('list', { name: 'Archivos seleccionados' })

const png = (name: string) => new File(['png-bytes'], name, { type: 'image/png' })
const pdf = (name: string) => new File(['%PDF-1.4'], name, { type: 'application/pdf' })
const gif = (name: string) => new File(['GIF89a'], name, { type: 'image/gif' })

function sampleHandler(status = 200) {
  return http.get('*/samples/:name', ({ params }) =>
    status === 200
      ? new HttpResponse(`sample ${String(params.name)}`, { status })
      : new HttpResponse(null, { status }),
  )
}

describe('UploadPage', () => {
  afterEach(() => {
    useSelectionStore.getState().clear()
  })

  it('presents the product, the drop zone and the privacy promise', async () => {
    renderUpload()

    expect(
      screen.getByRole('heading', { level: 1, name: 'De la foto al Excel, sin teclear.' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Zona para subir facturas' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Selecciona archivos' })).toBeInTheDocument()
    expect(
      screen.getByText('No almacenamos tus facturas: solo se envían para leer sus datos.'),
    ).toBeInTheDocument()
    expect(await screen.findByText(/JPG, PNG, WEBP o PDF · hasta 10\sarchivos/)).toBeInTheDocument()
  })

  it('takes the limits and formats from /meta', async () => {
    server.use(
      http.get('*/api/v1/meta', () =>
        HttpResponse.json({
          ...meta,
          limits: { ...meta.limits, max_files_per_request: 2, max_file_size_mb: 5 },
          accepted_mime_types: ['image/png', 'application/pdf'],
        }),
      ),
    )
    renderUpload()

    expect(
      await screen.findByText(/^PNG o PDF · hasta 2\sarchivos · máx\. 5\sMB cada uno$/),
    ).toBeInTheDocument()
  })

  it('lists selected files and explains the ones that cannot be sent', async () => {
    const user = renderUpload()

    await user.upload(fileInput(), [
      png('factura-luz.png'),
      pdf('factura.pdf'),
      gif('foto-gato.gif'),
    ])

    const list = fileList()
    expect(within(list).getAllByRole('listitem')).toHaveLength(3)
    expect(screen.getByText('2 archivos listos')).toBeInTheDocument()
    expect(within(fileList()).getAllByText('Listo').length).toBeGreaterThan(0)
    expect(within(fileList()).getAllByText('No se enviará').length).toBeGreaterThan(0)
    expect(screen.getByText(/1 con problemas/)).toBeInTheDocument()
    expect(screen.getByText('Formato no admitido. Usa JPG, PNG, WEBP o PDF.')).toBeInTheDocument()
    expect(screen.getByText('Se añadieron 3 archivos.')).toBeInTheDocument()

    const gifRow = screen.getByText('foto-gato.gif').closest('li')
    expect(gifRow).toHaveAccessibleDescription('Formato no admitido. Usa JPG, PNG, WEBP o PDF.')
  })

  it('removes one file or the whole list', async () => {
    const user = renderUpload()
    await user.upload(fileInput(), [png('a.png'), png('b.png')])

    await user.click(screen.getByRole('button', { name: 'Quitar a.png' }))
    expect(screen.queryByText('a.png')).not.toBeInTheDocument()
    expect(screen.getByText('Se quitó a.png.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Quitar todo' }))
    expect(screen.queryByRole('list', { name: 'Archivos seleccionados' })).not.toBeInTheDocument()
    expect(screen.getByText('Se vació la lista.')).toBeInTheDocument()
  })

  it('flags duplicates and files over the per-upload limit', async () => {
    server.use(
      http.get('*/api/v1/meta', () =>
        HttpResponse.json({ ...meta, limits: { ...meta.limits, max_files_per_request: 1 } }),
      ),
    )
    const user = renderUpload()
    await screen.findByText(/hasta 1\sarchivo /)

    const same = png('a.png')
    await user.upload(fileInput(), [same])
    await user.upload(fileInput(), [same, png('b.png')])

    expect(screen.getByText('Este archivo ya está en la lista.')).toBeInTheDocument()
    expect(
      screen.getByText('Ya tienes 1 archivo, el máximo por envío. Quita alguno para añadir este.'),
    ).toBeInTheDocument()
  })

  it('adds the fictional sample invoices once', async () => {
    server.use(sampleHandler())
    const user = renderUpload()

    await user.click(screen.getByRole('button', { name: 'Prueba con facturas de ejemplo' }))

    expect(await screen.findByText('ejemplo-factura-luz-mx.png')).toBeInTheDocument()
    expect(screen.getByText('ejemplo-estudio-diseno-es.pdf')).toBeInTheDocument()
    expect(screen.getByText('ejemplo-ticket-ferreteria-us.jpg')).toBeInTheDocument()
    expect(screen.getByText('3 archivos listos')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Prueba con facturas de ejemplo' }))
    expect(
      await screen.findByText('Las facturas de ejemplo ya están en la lista.'),
    ).toBeInTheDocument()
    expect(within(fileList()).getAllByRole('listitem')).toHaveLength(3)
  })

  it('reports when the samples cannot be loaded', async () => {
    server.use(sampleHandler(404))
    const user = renderUpload()

    await user.click(screen.getByRole('button', { name: 'Prueba con facturas de ejemplo' }))

    expect(
      await screen.findByText('No se pudieron cargar las facturas de ejemplo. Inténtalo de nuevo.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Archivos seleccionados' })).not.toBeInTheDocument()
  })

  it('reacts to files dragged over the zone and accepts dropped files', async () => {
    renderUpload()
    const zone = screen.getByRole('group', { name: 'Zona para subir facturas' })
    const dropped = png('arrastrada.png')
    const dataTransfer = {
      files: [dropped],
      items: [{ kind: 'file', type: dropped.type, getAsFile: () => dropped }],
      types: ['Files'],
    }

    fireEvent.dragEnter(zone, { dataTransfer })
    expect(await screen.findByText('Suéltalas para añadirlas')).toBeInTheDocument()
    expect(zone).toHaveAttribute('data-active')

    fireEvent.drop(zone, { dataTransfer })
    expect(await screen.findByText('arrastrada.png')).toBeInTheDocument()
    await waitFor(() => {
      expect(zone).not.toHaveAttribute('data-active')
    })
  })

  it('is fully translated in English', async () => {
    await i18n.changeLanguage('en')
    const user = renderUpload()

    expect(
      screen.getByRole('heading', { level: 1, name: 'From photo to Excel, no typing.' }),
    ).toBeInTheDocument()
    await user.upload(fileInput(), [gif('cat.gif')])
    expect(screen.getByText('Unsupported format. Use JPG, PNG, WEBP, or PDF.')).toBeInTheDocument()
    expect(screen.getByText('0 files ready')).toBeInTheDocument()
  })
})
