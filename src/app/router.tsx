import { createBrowserRouter, type RouteObject } from 'react-router'
import { ReviewHeaderNav, ReviewPage } from '@/features/invoice-review'
import { UploadPage } from '@/features/upload'
import { RootLayout, type RouteHandle } from './layout/RootLayout'

const reviewHandle: RouteHandle = { wide: true, headerNav: <ReviewHeaderNav /> }

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <UploadPage /> },
      { path: 'review', element: <ReviewPage />, handle: reviewHandle },
    ],
  },
]

export const router = createBrowserRouter(routes)
