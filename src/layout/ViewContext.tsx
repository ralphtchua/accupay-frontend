import { createContext, useContext, useState, type ReactNode } from 'react';
import type { ViewGroup } from '@/types/domain';

/* =====================================================================
   ViewContext — holds the active "View as" group (employee / approver /
   admin), exactly like the prototype's role switch. In production this
   would be derived from the signed-in user's permissions; the switch
   stays for admins who legitimately preview other views.
   ===================================================================== */

interface ViewContextValue {
  view: ViewGroup;
  setView: (v: ViewGroup) => void;
}

const ViewContext = createContext<ViewContextValue | null>(null);

export function ViewProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<ViewGroup>('employee');
  return <ViewContext.Provider value={{ view, setView }}>{children}</ViewContext.Provider>;
}

export function useView(): ViewContextValue {
  const ctx = useContext(ViewContext);
  if (!ctx) throw new Error('useView must be used within ViewProvider');
  return ctx;
}
