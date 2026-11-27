import { createBrowserRouter, type RouteObject } from 'react-router'
import { UploadPage } from '@/features/upload'
import { RootLayout, type RouteHandle } from './layout/RootLayout'
import { NotFoundPage } from './NotFoundPage'
import { RouteLoading } from './RouteLoading'

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <RootLayout />,
    children: [
      // The landing page ships in the main bundle; review and export load when first needed.
      { index: true, element: <UploadPage /> },
      {
        path: 'review',
        HydrateFallback: RouteLoading,
        lazy: async () => {
          const [{ ReviewHeaderNav, ReviewPage }, { ExportMenu }] = await Promise.all([
            import('@/features/invoice-review'),
            import('@/features/export'),
          ])
          const handle: RouteHandle = {
            wide: true,
            footer: false,
            headerNav: <ReviewHeaderNav />,
            headerActions: <ExportMenu />,
          }
          return { Component: ReviewPage, handle }
        },
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]

export const router = createBrowserRouter(routes)
