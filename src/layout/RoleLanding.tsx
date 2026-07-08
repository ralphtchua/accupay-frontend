import { Navigate } from 'react-router-dom';
import { useCurrentUser } from '@/context/CurrentUserContext';
import { VIEW_DEFAULT_ROUTE } from './nav';

/* =====================================================================
   RoleLanding — sends the signed-in user to their role's default route
   (employee → /dashboard, approver/admin → /approvals). Used for "/" and
   any unmatched path so admins never land on the employee dashboard.
   ===================================================================== */

export function RoleLanding() {
  const { viewGroup, loading } = useCurrentUser();
  if (loading) return null; // wait for the real role before deciding
  return <Navigate to={VIEW_DEFAULT_ROUTE[viewGroup]} replace />;
}
