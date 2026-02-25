import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'sonner'
import { ThemeProvider } from '@/hooks/useTheme'
import '@/i18n'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
      <Toaster
        position="bottom-right"
        toastOptions={{
          className: 'sonner-toast',
          style: {
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-foreground)',
          },
        }}
      />
    </ThemeProvider>
  </StrictMode>,
)
