import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AppRoutes } from '@/AppRoutes';
import { ViewProvider } from '@/layout/ViewContext';
import { ToastProvider } from '@/components/Toast';
import '@/styles/global.css';

/* Font: Plus Jakarta Sans, matching the prototype. */
const fontLink = document.createElement('link');
fontLink.rel = 'stylesheet';
fontLink.href =
  'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap';
document.head.appendChild(fontLink);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ViewProvider>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </ViewProvider>
    </BrowserRouter>
  </StrictMode>,
);
