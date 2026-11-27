# invoice-extractor-web — Frontend

Aplicación web donde cualquier persona sube fotos o PDFs de facturas, revisa y corrige los datos que extrajo la IA (con la imagen original al lado) y descarga el resultado en **Excel** o **PDF**. Consume la API de `invoice-extractor-api`. Es un proyecto de portafolio: UI cuidada, accesible, responsive, con tests y CI/CD.

## Ecosistema

```
facturas-ia/
├── buzon/                     ← comunicación con el backend (ver "Buzón")
│   ├── contrato/              ← contrato y openapi.json (los publica el BACKEND; solo lectura)
│   ├── para-backend/          ← mensajes que TÚ envías
│   └── para-frontend/         ← mensajes PARA ti
├── invoice-extractor-api/     ← backend (FastAPI). NUNCA edites archivos de ese repo.
└── invoice-extractor-web/     ← ESTE repo
```

Si no tienes acceso a `../buzon`, pide al usuario que lo añada a la sesión (`/add-dir ../buzon`).

## Al iniciar cada sesión

1. Lee `../buzon/para-frontend/` (ignora `procesados/`). Los `aviso-cambio` y los mensajes `prioridad: alta` van primero.
2. Compara `../buzon/contrato/openapi.json` con `openapi/openapi.json` del repo; si difieren, sincroniza (ver "Contrato").
3. Revisa el **Backlog** y continúa con la primera historia `pendiente`, salvo que el usuario indique otra. **Una historia a la vez.**

## Stack

| Propósito | Librería |
|---|---|
| Base | React 19 + TypeScript (strict) + Vite |
| Runtime / paquetes | Node 24 LTS + npm (`package-lock.json` versionado) |
| Estilos | Tailwind CSS |
| Componentes | shadcn/ui (Radix) — en `src/components/ui/`, código propio editable |
| Iconos | lucide-react |
| Estado del servidor | TanStack Query |
| Estado de la sesión (facturas del lote) | Zustand |
| Formularios | React Hook Form + Zod |
| Tabla de conceptos | TanStack Table |
| Subida de archivos | react-dropzone |
| Notificaciones | sonner |
| i18n | react-i18next (`es`, `en`; detecta idioma del navegador) |
| Rutas | React Router |
| Tipos de la API | openapi-typescript (generados, nunca a mano) |
| Mocks de la API | MSW (Mock Service Worker) |
| Tests | Vitest + Testing Library (+ MSW en tests) |
| Calidad | ESLint + Prettier |

Usa las versiones estables más recientes al crear el proyecto, con estas excepciones fijadas (revisar cuando el ecosistema las soporte):
- **TypeScript 6.0.x**, no 7: typescript-eslint (`<6.1`) y openapi-typescript dependen de la API JS de TS, que TS 7 (port nativo) no tiene.
- **ESLint 9**, no 10: eslint-plugin-jsx-a11y aún no soporta ESLint 10.

## Arquitectura: organizada por features

```
src/
├── app/
│   ├── App.tsx
│   ├── router.tsx             # "/" subir · "/review" revisar y exportar
│   ├── providers.tsx          # QueryClient, i18n, tema, Toaster
│   └── layout/                # header, footer, selector de idioma y tema
├── features/
│   ├── upload/                # dropzone, validación previa con /meta, llamada a /extract, progreso
│   ├── invoice-review/        # lista del lote, visor de imagen, formulario, conceptos, impuestos, issues
│   │   └── schema.ts          # esquema Zod del formulario (espejo del contrato)
│   └── export/                # opciones y descarga de Excel/PDF
│       (cada feature: components/, hooks/, api.ts, index.ts → solo se importa desde index.ts)
├── store/
│   └── invoices.ts            # Zustand: facturas del lote, archivo original, edición, validación
├── components/ui/             # shadcn/ui
├── lib/
│   ├── api-client.ts          # fetch tipado, baseURL, parseo de errores RFC 9457
│   ├── api-types.ts           # GENERADO desde openapi/openapi.json
│   ├── money.ts               # helpers de montos como string decimal
│   └── download.ts            # descarga de Blob + filename desde Content-Disposition
├── mocks/                     # handlers y fixtures de MSW según el contrato
├── i18n/
│   ├── es.json
│   └── en.json
└── main.tsx
openapi/openapi.json           # copia versionada del contrato del backend
```

Reglas:
- Un feature **no importa archivos internos de otro feature**; solo desde su `index.ts`. Lo compartido va en `lib/`, `store/` o `components/`.
- **Los tipos de la API se generan**, no se escriben a mano. Si falta algo en el contrato, se pide por el buzón.
- **Montos = strings decimales** (como en el contrato). No se convierten a `number` para hacer cálculos; para mostrar se usa `Intl.NumberFormat` con la moneda de la factura. La validación aritmética la hace **el backend** (`/invoices/validate`, con debounce), no el frontend.
- **Errores**: la API devuelve `code` + `params`; el texto sale de i18n (`errors.<CODE>`, `issues.<CODE>`). Siempre hay un texto genérico de respaldo para códigos desconocidos.
- **Privacidad**: las facturas viven **solo en memoria** (Zustand sin persistencia). Las imágenes originales se muestran con `URL.createObjectURL` y se liberan con `revokeObjectURL`.
- Accesibilidad: navegación completa con teclado, labels en todos los campos, contraste AA, `aria-live` para progreso y errores.
- Responsive desde 360 px. Modo claro/oscuro.

## Contrato

- Fuente: `../buzon/contrato/api-contract.md` y `../buzon/contrato/openapi.json` (publicados por el backend). **Solo lectura.**
- Sincronizar: copia `../buzon/contrato/openapi.json` a `openapi/openapi.json` y ejecuta `npm run gen:api` (regenera `src/lib/api-types.ts`). Commit en la rama de la historia en curso, o en una rama `chore/app/frt-app-NNNN` si es solo sincronización.
- El CI regenera los tipos y falla si difieren de los commiteados.
- Mientras el backend no publique `openapi.json`, trabaja con los tipos derivados de `api-contract.md` en los mocks y reemplázalos en cuanto exista.

## Mocks (trabajar sin depender del backend)

- MSW implementa **todos** los endpoints del contrato con fixtures realistas (varias monedas, impuestos, issues, un archivo que falla con `NOT_AN_INVOICE`, latencia simulada).
- `VITE_USE_MOCKS=true` activa MSW en el navegador (import dinámico: nunca entra en el bundle de producción si está en `false`).
- Los tests usan MSW en Node con los mismos handlers.
- Si al conectar con el backend real algo no coincide con el contrato → mensaje `incoherencia` en `../buzon/para-backend/`.

## Flujo de trabajo Git

### Ramas: una por historia, siempre desde `main` actualizado

Formato: `<tipo>/<modulo>/frt-<mod>-<NNNN>`

- `tipo`: `feat` | `fix` | `chore` | `refactor`
- `modulo` y su código de 3 letras:

| Módulo | Código | Cubre |
|---|---|---|
| `app` | `app` | estructura, layout, rutas, providers, cliente API, CI, Docker |
| `i18n` | `lng` | traducciones e idiomas |
| `upload` | `upl` | subida y extracción |
| `invoice-review` | `rev` | revisión y edición |
| `export` | `exp` | descargas |
| `deploy` | `dep` | despliegue y releases |

- `NNNN`: numeración **global y correlativa en este repo** (independiente del backend). Cada rama nueva —incluidos `fix` y `refactor` no planificados— toma el siguiente número y se registra en el Backlog.
- Regex (lo valida el CI): `^(feat|fix|chore|refactor)/[a-z0-9-]+/frt-[a-z]{3}-[0-9]{4}$`
- Ejemplos: `feat/upload/frt-upl-0005`, `fix/upload/frt-upl-0013`

### Commits

Formato: `<tipo>(<modulo>): <descripción en español, minúscula, sin punto final>`

- Ejemplos: `feat(upload): zona para arrastrar y soltar archivos`, `fix(invoice-review): foco perdido al agregar concepto`
- Commits pequeños y atómicos; tests en el mismo commit que el código. CI, tests y documentación → `chore`.
- Nunca commitees `.env` ni facturas reales.

### Pull requests

- Al terminar: `git push -u origin <rama>` y `gh pr create`.
- Título: `[FRT-UPL-0005] feat(upload): zona para arrastrar y soltar archivos`
- Cuerpo: qué se hizo, criterios de aceptación marcados, cómo probarlo, **capturas** si hay cambios visuales.
- **No hagas merge sin la aprobación del usuario.** Merge con squash. Después: `git checkout main && git pull`, borra la rama local y marca la historia como `hecha`.

## Buzón

Protocolo completo en `../buzon/README.md`. Resumen:
- Escribe en `../buzon/para-backend/AAAA-MM-DD-NN-tema.md` cuando falte un dato en la API, encuentres una incoherencia con el contrato o tengas una duda. Incluye un ejemplo concreto del JSON que necesitas.
- Al atender un mensaje de `para-frontend/`: completa `## Respuesta`, cambia `estado`, muévelo a `procesados/`.
- Si estás bloqueado esperando al backend, sigue con mocks y deja el punto anotado en el PR.

## Comandos

```bash
npm install
npm run dev              # :5173
npm run dev:mock         # con VITE_USE_MOCKS=true
npm run build
npm run preview
npm run test             # vitest
npm run test:coverage
npm run lint             # eslint
npm run format:check     # prettier
npm run typecheck        # tsc --noEmit
npm run gen:api          # openapi/openapi.json → src/lib/api-types.ts
docker compose up --build   # build de producción servido con nginx en :8080
```

## Variables de entorno (`.env.example` siempre actualizado)

| Variable | Ejemplo | Descripción |
|---|---|---|
| `VITE_API_URL` | `http://localhost:8000` | URL base de la API (sin `/api/v1`) |
| `VITE_USE_MOCKS` | `false` | Activa MSW |

Son variables de **build** (Vite las incrusta). Nunca pongas secretos aquí: todo lo que empieza con `VITE_` es público.

## Tests

- Componentes y hooks con Testing Library, priorizando el comportamiento del usuario (`getByRole`, `userEvent`) sobre detalles de implementación.
- Flujo principal cubierto: subir → ver resultados → editar un monto → ver issue actualizado → exportar.
- Casos de error: archivo rechazado, `429`, `503`, éxito parcial.
- Cobertura mínima: 70 % (el CI falla por debajo).

## Docker

- `Dockerfile` multi-stage: `node:24-alpine` para build (`ARG VITE_API_URL`) → `nginx:alpine` para servir `dist/`.
- `nginx.conf` con fallback SPA (`try_files ... /index.html`), gzip, caché larga para `/assets/*` y sin caché para `index.html`. Usuario no root, `HEALTHCHECK`.
- `docker-compose.yml` con el servicio `web` en `:8080`.
- `.dockerignore` completo.

## CI/CD

Solo lo que aporta valor:

| Workflow | Disparador | Qué hace |
|---|---|---|
| `ci.yml` | PR a `main` y push a `main` | ESLint, Prettier, `tsc`, Vitest + cobertura ≥ 70 %, verificar tipos generados de la API, `npm run build`, `docker build` (sin push) |
| `branch-name.yml` | PR | Valida el nombre de la rama |
| `dependabot.yml` | mensual | Actualizaciones de npm y GitHub Actions agrupadas |
| Previews de Vercel | cada PR (integración Git de Vercel) | URL de preview **con mocks** (`VITE_USE_MOCKS=true`) para revisar la UI sin backend |
| `release.yml` | push a `main` (frt-dep-0012) | release-please: PR de release con versión semver + CHANGELOG |
| `deploy.yml` | **release publicado** (frt-dep-0012) | Build y deploy a producción en Vercel con la CLI + smoke test |

**Estrategia de despliegue:** CI en cada PR y en `main`; previews en cada PR; **producción solo al publicar un release**.

## Definition of Done (toda historia)

- [ ] Criterios de aceptación cumplidos
- [ ] Tests pasando; cobertura ≥ 70 %
- [ ] Lint, formato y `tsc` sin errores
- [ ] Textos nuevos en `es.json` **y** `en.json` (sin textos hardcodeados en componentes)
- [ ] Funciona con teclado, en móvil (360 px) y en modo oscuro
- [ ] Mocks actualizados si cambió el contrato
- [ ] PR abierto con el formato indicado; Backlog actualizado

## Backlog

Estados: `pendiente` | `en curso` | `hecha`. Añade al final las historias nuevas con el siguiente número.

| ID | Rama | Estado |
|---|---|---|
| FRT-APP-0001 | `chore/app/frt-app-0001` | hecha |
| FRT-APP-0002 | `chore/app/frt-app-0002` | hecha |
| FRT-APP-0003 | `feat/app/frt-app-0003` | hecha |
| FRT-LNG-0004 | `feat/i18n/frt-lng-0004` | hecha |
| FRT-UPL-0005 | `feat/upload/frt-upl-0005` | hecha |
| FRT-UPL-0006 | `feat/upload/frt-upl-0006` | hecha |
| FRT-REV-0007 | `feat/invoice-review/frt-rev-0007` | en curso |
| FRT-REV-0008 | `feat/invoice-review/frt-rev-0008` | pendiente |
| FRT-REV-0009 | `feat/invoice-review/frt-rev-0009` | pendiente |
| FRT-EXP-0010 | `feat/export/frt-exp-0010` | pendiente |
| FRT-APP-0011 | `feat/app/frt-app-0011` | pendiente |
| FRT-DEP-0012 | `chore/deploy/frt-dep-0012` | pendiente |

### FRT-APP-0001 — Estructura base del proyecto
*Como desarrollador quiero un proyecto base funcional para construir sobre él.*
- `git init` si hace falta. Vite + React + TS strict, Tailwind, shadcn/ui inicializado, ESLint, Prettier, Vitest + Testing Library.
- Estructura de carpetas de la sección Arquitectura; alias `@/` → `src/`.
- Scripts de `package.json` de la sección Comandos.
- `Dockerfile`, `nginx.conf`, `.dockerignore`, `docker-compose.yml`. `docker compose up` sirve la app en `:8080`.
- `.env.example`, `.gitignore`, `README.md` inicial (qué es, stack, cómo correrlo).

### FRT-APP-0002 — Integración continua
*Como desarrollador quiero que cada PR se verifique automáticamente.*
- `.github/workflows/ci.yml` (Node 24 con caché de npm): lint, format, typecheck, tests con cobertura, build, `docker build`.
- `branch-name.yml` y `dependabot.yml` (npm + github-actions, mensual, agrupado).
- Badge de CI en el README.

### FRT-APP-0003 — Cliente API, tipos y mocks
*Como desarrollador quiero hablar con la API de forma tipada y poder trabajar sin backend.*
- `openapi/openapi.json` (o tipos provisionales desde `api-contract.md` si aún no existe) + `npm run gen:api` + paso del CI que verifica los tipos.
- `lib/api-client.ts`: baseURL desde `VITE_API_URL`, parseo de errores RFC 9457 a un `ApiError { code, status, params }`.
- MSW con handlers y fixtures para **todos** los endpoints del contrato; `npm run dev:mock`.
- `providers.tsx` con QueryClient (sin reintentos para 4xx), Toaster y router con las dos rutas vacías.
- Hook `useMeta()` (límites y formatos desde `/meta`, cacheado).

### FRT-LNG-0004 — Idiomas
*Como usuario de cualquier país quiero usar la app en mi idioma.*
- react-i18next con `es` y `en`, detección del idioma del navegador, selector en el header, preferencia guardada en `localStorage`.
- Traducciones de **todos** los códigos de error HTTP, errores por archivo e issues de validación del contrato, interpolando `params`.
- Formateo de fechas y montos con `Intl` según el idioma activo.
- Test que falla si una clave existe en un idioma y no en el otro.

### FRT-UPL-0005 — Subir archivos
*Como usuario quiero arrastrar o seleccionar mis facturas.*
- Página `/` con presentación breve del producto y zona react-dropzone (arrastrar, clic, varios archivos).
- Validación previa en el cliente con los límites de `/meta` (tipo, tamaño, cantidad) y mensajes claros por archivo.
- Lista de archivos seleccionados con miniatura, tamaño y botón para quitar.
- Aviso de privacidad visible: "no almacenamos tus facturas".

### FRT-UPL-0006 — Extraer datos
*Como usuario quiero procesar mis facturas y ver cuáles se leyeron bien.*
- Llamada a `POST /invoices/extract` (mutation de TanStack Query) con estado de progreso accesible.
- Resultados guardados en el store (factura + archivo original + validación + confianza).
- Éxito parcial: los fallidos se muestran con su motivo traducido y opción de quitarlos o reintentar.
- Manejo de `429` (mostrar cuánto esperar), `503` y errores de red.
- Al terminar, navegar a `/review`.

### FRT-REV-0007 — Revisar y editar datos generales
*Como usuario quiero ver la factura original junto a los datos para corregir errores de la IA.*
- `/review`: lista del lote (con estado de validación de cada factura) + visor de la imagen/PDF original (zoom) + formulario.
- Formulario React Hook Form + Zod: tipo, número, fechas, moneda, país, emisor, receptor, método de pago, notas.
- Campos con confianza < 0.7 resaltados con una explicación accesible.
- En móvil: visor y formulario en pestañas.

### FRT-REV-0008 — Conceptos e impuestos
*Como usuario quiero corregir las líneas e impuestos de la factura.*
- Tabla editable de conceptos (TanStack Table + `useFieldArray`): agregar, editar, eliminar líneas.
- Lista editable de impuestos (0..N).
- Subtotal, descuentos y total editables. Montos mostrados con el formato de la moneda.

### FRT-REV-0009 — Validación en vivo
*Como usuario quiero saber al momento si los números cuadran después de editar.*
- Al editar, llamar a `POST /invoices/validate` con debounce (~600 ms) y cancelar peticiones obsoletas.
- Panel de issues traducidos; clic en un issue lleva al campo afectado.
- Estado de la factura (válida / advertencias / inválida) actualizado en la lista del lote.

### FRT-EXP-0010 — Exportar
*Como usuario quiero descargar mis facturas en Excel o PDF.*
- Panel de exportación: Excel o PDF, idioma del archivo, incluir conceptos, incluir alertas.
- Exportar todo el lote o solo las facturas seleccionadas.
- Confirmación si hay facturas `invalid` ("¿exportar de todos modos?").
- Descarga con el nombre de `Content-Disposition`; toast de éxito o error.

### FRT-APP-0011 — Pulido final de la experiencia
*Como usuario quiero una app clara, rápida y agradable.*
- Layout final: header (idioma, tema), footer (enlace a GitHub, aviso de privacidad).
- Modo oscuro con preferencia del sistema y selector manual.
- Estados vacíos, de carga (skeletons) y de error en todas las vistas; página 404.
- Aviso si el backend tarda en responder la primera vez ("despertando el servidor…", el Space gratuito puede estar dormido).
- Revisión de accesibilidad (teclado, foco, contraste) y Lighthouse ≥ 90 en Performance y Accessibility.
- README con capturas y GIF del flujo.

### FRT-DEP-0012 — Releases y despliegue a producción
*Como dueño del proyecto quiero publicar versiones estables en la nube de forma controlada.*
- `release.yml` con **release-please** (tipo `node`): PR de release con versión semver y `CHANGELOG.md`. Versión visible en el footer.
- `vercel.json` con fallback SPA y `"git": { "deploymentEnabled": { "main": false } }` (sin deploys automáticos de producción; las previews de PR siguen activas, con `VITE_USE_MOCKS=true` en el entorno Preview).
- `deploy.yml` en **`release: published`**: `vercel pull` → `vercel build --prod` → `vercel deploy --prebuilt --prod` con los secretos `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`; `VITE_API_URL` = URL pública del backend (llega por el buzón).
- Smoke test: la URL de producción responde 200.
- Documentar en el README los pasos manuales: crear el proyecto en Vercel, variables de entorno y secretos de GitHub. Avisar al backend por el buzón la URL de producción (para `ALLOWED_ORIGINS`).
