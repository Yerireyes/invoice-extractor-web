// Prerenders the landing page into dist/index.html after `vite build` (FRT-APP-0013).
//
// The server build (dist-ssr/, from src/entry-server.tsx) renders "/" in each language. Both
// versions go into index.html as <template>s, and a tiny inline script copies the one for the
// visitor's language into #root before first paint — the same choice i18n will make (saved
// language, then the browser's, then English). The page is visible before any JavaScript runs;
// main.tsx then hydrates it. Other paths, or a language mismatch, fall back to a client render.
//
// Usage: node scripts/prerender.mjs (part of `npm run build`).
import { readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const root = path.resolve(import.meta.dirname, '..')
const dist = path.join(root, 'dist')
const ssrDir = path.join(root, 'dist-ssr')
const indexPath = path.join(dist, 'index.html')

const LANGUAGES = ['es', 'en']
const FALLBACK = 'en'
const STORAGE_KEY = 'invoice-extractor.language' // LANGUAGE_STORAGE_KEY in src/i18n/index.ts

const { render } = await import(pathToFileURL(path.join(ssrDir, 'entry-server.js')).href)

const templates = []
for (const language of LANGUAGES) {
  const html = await render('/', language)
  if (!html.includes('<main')) throw new Error(`Prerender of / (${language}) looks empty`)
  templates.push(`<template id="prerender-${language}">${html}</template>`)
}

// Mirrors i18next's detection (order: localStorage, navigator; languageOnly; fallback English).
const picker = `<script>
(function () {
  if (location.pathname !== '/') return
  var supported = ${JSON.stringify(LANGUAGES)}
  var language = null
  try {
    var saved = localStorage.getItem(${JSON.stringify(STORAGE_KEY)})
    if (saved && supported.indexOf(saved.split('-')[0]) !== -1) language = saved.split('-')[0]
  } catch (error) {}
  var browser = navigator.languages || [navigator.language]
  for (var i = 0; !language && i < browser.length; i++) {
    var base = String(browser[i]).toLowerCase().split('-')[0]
    if (supported.indexOf(base) !== -1) language = base
  }
  language = language || ${JSON.stringify(FALLBACK)}
  var template = document.getElementById('prerender-' + language)
  var app = document.getElementById('root')
  if (!template || !app) return
  app.innerHTML = template.innerHTML
  app.dataset.prerendered = language
  document.documentElement.lang = language
})()
</script>`

let index = readFileSync(indexPath, 'utf8')
const marker = '<div id="root"></div>'
if (!index.includes(marker)) throw new Error(`${marker} not found in dist/index.html`)

// Start the app's JavaScript right after the first paint instead of from <head>: the page is
// already there (prerendered), so painting it must not wait for — or compete with — ~165 kB of JS
// on a slow connection. Costs one frame before hydration. Vite's module script and modulepreload
// links are moved into a loader that adds them back once the browser has painted.
const entry = /<script type="module" crossorigin src="([^"]+)"><\/script>\s*/.exec(index)
if (!entry) throw new Error('Module entry script not found in dist/index.html')
const preloads = [...index.matchAll(/<link rel="modulepreload" crossorigin href="([^"]+)">\s*/g)]
index = index.replace(entry[0], '')
for (const preload of preloads) index = index.replace(preload[0], '')
const loader = `<script>
(function () {
  function start() {
    ${JSON.stringify(preloads.map((preload) => preload[1]))}.forEach(function (href) {
      var link = document.createElement('link')
      link.rel = 'modulepreload'
      link.crossOrigin = ''
      link.href = href
      document.head.appendChild(link)
    })
    var script = document.createElement('script')
    script.type = 'module'
    script.crossOrigin = ''
    script.src = ${JSON.stringify(entry[1])}
    document.head.appendChild(script)
  }
  var started = false
  function once() {
    if (started) return
    started = true
    start()
  }
  // Hidden tabs do not paint either. Otherwise wait for the first contentful
  // paint, with a short cap for browsers that do not report it.
  // Without a prerendered page (any path but "/") there is nothing to paint before the app.
  var app = document.getElementById('root')
  if (!app || !app.dataset.prerendered || document.visibilityState === 'hidden') return once()
  setTimeout(once, 1000)
  try {
    new PerformanceObserver(function (list) {
      if (list.getEntriesByName('first-contentful-paint').length) setTimeout(once, 0)
    }).observe({ type: 'paint', buffered: true })
  } catch (error) {
    requestAnimationFrame(function () { requestAnimationFrame(once) })
  }
})()
</script>`

writeFileSync(
  indexPath,
  index.replace(marker, `${marker}\n${templates.join('\n')}\n${picker}\n${loader}`),
)
rmSync(ssrDir, { recursive: true, force: true })

const kb = (text) => `${(Buffer.byteLength(text) / 1024).toFixed(1)} kB`
console.log(
  `Prerendered / in ${LANGUAGES.join(', ')} → dist/index.html (${templates.map(kb).join(' + ')})`,
)
