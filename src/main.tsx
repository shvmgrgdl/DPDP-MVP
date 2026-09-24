import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import { Toaster } from 'sonner'
import '@fontsource/public-sans/400.css'
import '@fontsource/public-sans/500.css'
import '@fontsource/public-sans/600.css'
import '@fontsource/public-sans/700.css'
import '@fontsource-variable/fraunces'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/500.css'
import '@fontsource/noto-sans-devanagari/400.css'
import '@fontsource/noto-sans-devanagari/600.css'
import './index.css'
import { router } from './app/router'
import { useApp } from './store/app'
import { BrandMark } from './shell/AppShell'

function Root() {
  const hydrated = useApp((s) => s.hydrated)
  if (!hydrated)
    return (
      <div className="flex h-full items-center justify-center gap-3 text-ink-2">
        <BrandMark /> <span className="font-display text-lg">School DPDP OS</span>
      </div>
    )
  return <RouterProvider router={router} />
}

;(window as unknown as { __app: typeof useApp }).__app = useApp

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
    <Toaster position="bottom-right" richColors closeButton />
  </StrictMode>,
)
