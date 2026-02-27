import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { Toaster } from 'sonner'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { router } from './router.tsx'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <RouterProvider router={router} />
      <Toaster
        position="bottom-right"
        richColors
        toastOptions={{
          style: { fontFamily: "inherit", fontSize: 13, fontWeight: 700, borderRadius: 16 },
        }}
      />
    </GoogleOAuthProvider>
  </StrictMode>,
)
