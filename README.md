# Invoice Extractor — Web

[![CI](https://github.com/Yerireyes/invoice-extractor-web/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/Yerireyes/invoice-extractor-web/actions/workflows/ci.yml)

Aplicación web para extraer datos de facturas con IA: subes fotos o PDFs, revisas y corriges lo que extrajo el modelo con la imagen original al lado, y descargas el resultado en **Excel** o **PDF**.

Es el frontend de [`invoice-extractor-api`](https://github.com/Yerireyes/invoice-extractor-api). Las facturas **no se almacenan**: viven solo en la memoria del navegador durante la sesión.

> Proyecto de portafolio: UI accesible y responsive, tests y CI/CD.

## Stack

| Propósito             | Herramienta                                       |
| --------------------- | ------------------------------------------------- |
| Base                  | React 19 + TypeScript 6 (strict) + Vite 8         |
| Estilos y componentes | Tailwind CSS 4 + shadcn/ui (Radix) + lucide-react |
| Estado                | TanStack Query (servidor) · Zustand (sesión)      |
| Formularios           | React Hook Form + Zod                             |
| i18n                  | react-i18next (`es`, `en`)                        |
| Tipos de la API       | openapi-typescript (generados desde el contrato)  |
| Mocks                 | MSW                                               |
| Tests                 | Vitest + Testing Library                          |
| Calidad               | ESLint 9 + Prettier                               |
| Producción            | Docker (nginx) · Vercel                           |

## Requisitos

- Node 24 LTS (ver `.nvmrc`) y npm
- Docker (opcional, para el build de producción)

## Cómo correrlo

```bash
cp .env.example .env     # ajusta VITE_API_URL si hace falta
npm install
npm run dev              # http://localhost:5173
npm run dev:mock         # igual, pero con la API simulada (MSW)
```

Build de producción servido con nginx:

```bash
docker compose up --build   # http://localhost:8080
```

## Scripts

| Comando                                       | Qué hace                                                     |
| --------------------------------------------- | ------------------------------------------------------------ |
| `npm run dev` / `dev:mock`                    | Servidor de desarrollo (con API real / simulada)             |
| `npm run build` / `preview`                   | Build de producción y vista previa                           |
| `npm run test` / `test:coverage`              | Tests (cobertura mínima 70 %)                                |
| `npm run lint` / `format:check` / `typecheck` | Calidad: ESLint, Prettier, `tsc`                             |
| `npm run gen:api`                             | Regenera `src/lib/api-types.ts` desde `openapi/openapi.json` |

## Variables de entorno

| Variable         | Ejemplo                 | Descripción                        |
| ---------------- | ----------------------- | ---------------------------------- |
| `VITE_API_URL`   | `http://localhost:8000` | URL base de la API (sin `/api/v1`) |
| `VITE_USE_MOCKS` | `false`                 | Activa MSW en lugar de la API real |

Son variables de **build**: Vite las incrusta en el bundle, así que son públicas. Nunca pongas secretos en ellas.

## Modo mock

`npm run dev:mock` usa [MSW](https://mswjs.io) para simular **todos** los endpoints del contrato con facturas ficticias en varias monedas (MXN, EUR, USD, GBP), impuestos, issues de validación y latencia simulada. La validación también se simula, así que los issues cambian al editar.

Algunos nombres de archivo disparan escenarios de error:

| El nombre contiene           | Resultado                                           |
| ---------------------------- | --------------------------------------------------- |
| `perro`, `dog`, `no-factura` | Ese archivo falla con `NOT_AN_INVOICE`              |
| `borrosa`, `blurry`          | Ese archivo falla con `UNREADABLE_FILE`             |
| `rate-limit`                 | Toda la petición: `429 RATE_LIMITED` (esperar 30 s) |
| `quota`                      | Toda la petición: `503 LLM_QUOTA_EXCEEDED`          |
| `offline`                    | Toda la petición: `503 LLM_UNAVAILABLE`             |

MSW solo entra en el build cuando `VITE_USE_MOCKS=true`; el bundle de producción no lo incluye.

## Contrato de la API

Los tipos de `src/lib/api-types.ts` se **generan** desde `openapi/openapi.json` con `npm run gen:api` (el CI falla si no están al día). El contrato lo publica el backend en `../buzon/contrato/openapi.json`.

```bash
npm run sync:api   # contrato publicado + openapi/provisional.json → openapi/openapi.json → tipos
```

`openapi/provisional.json` cubre los endpoints que el backend aún no ha publicado (derivados de `api-contract.md`). Lo publicado siempre tiene prioridad y lo provisional se marca con `x-provisional: true`, así que desaparece solo en cuanto el backend publica cada endpoint.

## Estructura

```
src/
├── app/          # App, router, providers y layout
├── features/     # upload · invoice-review · export (cada una expone solo su index.ts)
├── store/        # estado del lote de facturas (Zustand, solo en memoria)
├── components/ui # componentes shadcn/ui
├── lib/          # cliente API, tipos generados, utilidades
├── mocks/        # handlers y fixtures de MSW
└── i18n/         # traducciones es / en
```
