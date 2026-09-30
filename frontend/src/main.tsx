import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import './index.css'
import App from './App.tsx'
import { queryClient } from './lib/queryClient'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      {/* Short confirmations after actions; page-level errors use StateView instead */}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            fontFamily: 'var(--font-sans)',
            fontSize: '14px',
            color: 'var(--color-ink)',
            border: '1px solid var(--color-border)',
            borderRadius: '10px',
          },
          success: { iconTheme: { primary: 'var(--color-success)', secondary: '#FFFFFF' } },
          error: { iconTheme: { primary: 'var(--color-primary)', secondary: '#FFFFFF' } },
        }}
      />
    </QueryClientProvider>
  </StrictMode>,
)
