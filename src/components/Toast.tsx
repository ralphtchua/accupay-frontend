import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

/* =====================================================================
   Toast — bottom-center transient message, matching the prototype.
   Exposed via a context so any screen can call notify('Saved ✓').
   ===================================================================== */

type ToastContextValue = { notify: (message: string) => void };

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const notify = useCallback((msg: string) => {
    setMessage(msg);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage(null), 2800);
  }, []);

  return (
    <ToastContext.Provider value={{ notify }}>
      {children}
      {message && <div className="ao-toast" role="status">{message}</div>}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
