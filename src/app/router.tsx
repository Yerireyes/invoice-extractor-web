import { createBrowserRouter, type RouteObject } from 'react-router'
import { ReviewPage } from '@/features/invoice-review'
import { UploadPage } from '@/features/upload'
import { RootLayout } from './layout/RootLayout'

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <UploadPage /> },
      { path: 'review', element: <ReviewPage /> },
    ],
  },
]

export const router = createBrowserRouter(routes)
