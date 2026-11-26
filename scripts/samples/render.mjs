// Renders the fictional sample invoices (scripts/samples/*.html) into public/samples/ with headless
// Chrome through the DevTools protocol. No dependencies.
//
// Usage: node scripts/samples/render.mjs   (CHROME_PATH=<path to chrome> if not in the default place)
import { spawn } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const here = import.meta.dirname
const out = path.resolve(here, '../../public/samples')
const chromePath =
  process.env.CHROME_PATH ??
  {
    win32: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    darwin: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    linux: 'google-chrome',
  }[process.platform]

const JOBS = [
  { source: 'factura-luz-mx.html', output: 'ejemplo-factura-luz-mx.png', kind: 'png', width: 920 },
  { source: 'estudio-diseno-es.html', output: 'ejemplo-estudio-diseno-es.pdf', kind: 'pdf' },
  {
    source: 'ticket-ferreteria-us.html',
    output: 'ejemplo-ticket-ferreteria-us.jpg',
    kind: 'jpeg',
    width: 520,
  },
]

const port = 9340
const chrome = spawn(chromePath, [
  '--headless=new',
  '--disable-gpu',
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${mkdtempSync(path.join(tmpdir(), 'samples-'))}`,
  'about:blank',
])
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

try {
  let targets
  for (let attempt = 0; attempt < 40 && !targets; attempt++) {
    try {
      targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json()
    } catch {
      await sleep(250)
    }
  }
  const page = targets.find((target) => target.type === 'page')
  const socket = new WebSocket(page.webSocketDebuggerUrl)
  await new Promise((resolve) => socket.addEventListener('open', resolve))
  let id = 0
  const pending = new Map()
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data)
    pending.get(message.id)?.(message.result)
    pending.delete(message.id)
  })
  const send = (method, params = {}) =>
    new Promise((resolve) => {
      pending.set(++id, resolve)
      socket.send(JSON.stringify({ id, method, params }))
    })

  for (const job of JOBS) {
    const url = pathToFileURL(path.join(here, job.source)).href
    if (job.kind !== 'pdf') {
      await send('Emulation.setDeviceMetricsOverride', {
        width: job.width,
        height: 800,
        deviceScaleFactor: 1.5,
        mobile: false,
      })
    }
    await send('Page.navigate', { url })
    await sleep(800)

    let data
    if (job.kind === 'pdf') {
      ;({ data } = await send('Page.printToPDF', {
        printBackground: true,
        preferCSSPageSize: true,
      }))
    } else {
      const { cssContentSize } = await send('Page.getLayoutMetrics')
      ;({ data } = await send('Page.captureScreenshot', {
        format: job.kind,
        quality: job.kind === 'jpeg' ? 82 : undefined,
        captureBeyondViewport: true,
        clip: { x: 0, y: 0, width: job.width, height: Math.ceil(cssContentSize.height), scale: 1 },
      }))
    }
    writeFileSync(path.join(out, job.output), Buffer.from(data, 'base64'))
    console.log(`public/samples/${job.output}`)
  }
  socket.close()
} finally {
  chrome.kill()
}
