import { createBrowserRouter, RouterProvider } from 'react-router'
import { Providers } from './providers'
import { routes } from './router'

// Created here, not in router.tsx: the prerender imports the routes in Node, without a window.
const router = createBrowserRouter(routes)

export function App() {
  return (
    <Providers>
      <RouterProvider router={router} />
    </Providers>
  )
}
