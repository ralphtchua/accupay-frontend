import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { ViewGroup } from "@/types/domain";
import type { User } from "@/interfaces/User";
import {
  getCurrentEmployee,
  getCurrentOrganization,
  getCurrentRole,
  type CurrentOrganization,
  type CurrentRole,
} from "@/services/AuthService";
import { useView } from "@/layout/ViewContext";

/* =====================================================================
   CurrentUserContext — loads the signed-in user's real identity from the
   C# API once (account + organization + role) and shares it across the
   authenticated shell (header today, more screens later). It also seeds
   the "View as" switch from the user's real role so admins land on the
   admin view and employees on the employee view.
   ===================================================================== */

interface CurrentUserValue {
  user: User | null;
  organization: CurrentOrganization | null;
  role: CurrentRole | null;
  /** The view group derived from the user's real role/type. */
  viewGroup: ViewGroup;
  loading: boolean;
}

const CurrentUserContext = createContext<CurrentUserValue | null>(null);

/** Map the signed-in user's real role/type onto one of the app's view groups. */
function toViewGroup(user: User | null, role: CurrentRole | null): ViewGroup {
  // A real role is authoritative. The account "type" is only a fallback — the
  // API labels any account with no linked employee as "Admin" — so we trust the
  // role whenever one is assigned. Only admin and employee remain.
  if (role) return role.isAdmin ? "admin" : "employee";
  return user?.type === "Admin" ? "admin" : "employee";
}

export function CurrentUserProvider({ children }: { children: ReactNode }) {
  const { setView } = useView();
  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<CurrentOrganization | null>(
    null,
  );
  const [role, setRole] = useState<CurrentRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        // Organization/role are best-effort: an employee with no role assigned
        // still gets a valid identity, so don't let those fail the whole load.
        const [u, org, r] = await Promise.all([
          getCurrentEmployee(),
          getCurrentOrganization().catch(() => null),
          getCurrentRole().catch(() => null),
        ]);
        if (!alive) return;
        setUser(u);
        setOrganization(org);
        setRole(r);
        setView(toViewGroup(u, r)); // default the "View as" from the real role
      } catch {
        // Not authenticated / token expired — leave defaults; the axios
        // interceptor already clears the token on 401/403.
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [setView]);

  return (
    <CurrentUserContext.Provider
      value={{
        user,
        organization,
        role,
        viewGroup: toViewGroup(user, role),
        loading,
      }}
    >
      {children}
    </CurrentUserContext.Provider>
  );
}

export function useCurrentUser(): CurrentUserValue {
  const ctx = useContext(CurrentUserContext);
  if (!ctx) {
    throw new Error("useCurrentUser must be used within CurrentUserProvider");
  }
  return ctx;
}
