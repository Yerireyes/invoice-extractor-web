// Builds openapi/openapi.json from the contract published by the backend
// (../buzon/contrato/openapi.json) plus openapi/provisional.json, which covers endpoints the
// backend has not published yet. Published paths and schemas always win; provisional ones are
// tagged with `x-provisional: true` and disappear as soon as the backend publishes them.
//
// Usage: npm run sync:api [-- <path-to-published-openapi.json>]
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const publishedPath = path.resolve(root, process.argv[2] ?? '../buzon/contrato/openapi.json')
const provisionalPath = path.join(root, 'openapi/provisional.json')
const outPath = path.join(root, 'openapi/openapi.json')

const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'))
const published = readJson(publishedPath)
const provisional = readJson(provisionalPath)

const merged = structuredClone(published)
merged.paths ??= {}
merged.components ??= {}
merged.components.schemas ??= {}

const added = { paths: [], schemas: [] }

for (const [route, item] of Object.entries(provisional.paths ?? {})) {
  if (route in merged.paths) continue
  merged.paths[route] = Object.fromEntries(
    Object.entries(item).map(([method, op]) => [method, { ...op, 'x-provisional': true }]),
  )
  added.paths.push(route)
}

for (const [name, schema] of Object.entries(provisional.components?.schemas ?? {})) {
  if (name in merged.components.schemas) continue
  merged.components.schemas[name] = { ...schema, 'x-provisional': true }
  added.schemas.push(name)
}

// Every provisional $ref must resolve against the merged document.
const missing = new Set()
JSON.stringify(merged, (key, value) => {
  if (key === '$ref' && typeof value === 'string') {
    const name = value.replace('#/components/schemas/', '')
    if (!(name in merged.components.schemas)) missing.add(name)
  }
  return value
})
if (missing.size > 0) {
  console.error(`Unresolved $ref after merge: ${[...missing].join(', ')}`)
  process.exit(1)
}

writeFileSync(outPath, JSON.stringify(merged, null, 2) + '\n')
console.log(
  `openapi/openapi.json ← ${path.relative(root, publishedPath)} (v${published.info?.version})`,
)
console.log(`Provisional paths (${added.paths.length}): ${added.paths.join(', ') || '—'}`)
console.log(`Provisional schemas (${added.schemas.length}): ${added.schemas.join(', ') || '—'}`)
