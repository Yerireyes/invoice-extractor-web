import { downloadBlob, filenameFromContentDisposition } from './download'

describe('filenameFromContentDisposition', () => {
  it.each([
    ['attachment; filename="facturas_20261127_1830.xlsx"', 'facturas_20261127_1830.xlsx'],
    ['attachment; filename=facturas.pdf', 'facturas.pdf'],
    [
      `attachment; filename="facturas.xlsx"; filename*=UTF-8''facturas%20%C3%B1.xlsx`,
      'facturas ñ.xlsx',
    ],
    ['attachment; filename="../../etc/facturas.pdf"', 'facturas.pdf'],
  ])('reads %j', (header, expected) => {
    expect(filenameFromContentDisposition(header, 'x')).toBe(expected)
  })

  it.each([null, 'attachment', 'attachment; filename=""', `attachment; filename*=UTF-8''%E0%A4%A`])(
    'falls back for %j',
    (header) => {
      expect(filenameFromContentDisposition(header, 'facturas.xlsx')).toBe('facturas.xlsx')
    },
  )
})

describe('downloadBlob', () => {
  it('clicks a temporary link with the name and revokes the URL', async () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
    const revoke = vi.spyOn(URL, 'revokeObjectURL')

    downloadBlob(new Blob(['x']), 'facturas.pdf')

    expect(click).toHaveBeenCalledTimes(1)
    const link = click.mock.contexts[0] as HTMLAnchorElement
    expect(link.download).toBe('facturas.pdf')
    expect(document.querySelector('a[download]')).toBeNull()
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(revoke).toHaveBeenCalledTimes(1)
    click.mockRestore()
  })
})
