const TOKEN_KEY = "auth_token";

interface JwtPayload {
  exp?: number;
  employee_id?: string;
}

export const tokenService = {
  get: (): string | null => {
    const token = localStorage.getItem(TOKEN_KEY);

    if (token && isExpired(token)) {
      localStorage.removeItem(TOKEN_KEY);
      return null;
    }

    return token;
  },

  isAuthenticated: (): boolean => {
    return tokenService.get() != null;
  },

  /** The signed-in user's employee RowID from the JWT (null for admins). */
  getEmployeeId: (): number | null => {
    const token = tokenService.get();
    if (!token) return null;
    const raw = decodeJwtPayload(token)?.employee_id;
    const id = raw ? parseInt(raw, 10) : NaN;
    return Number.isFinite(id) && id > 0 ? id : null;
  },

  set: (token: string): void => {
    localStorage.setItem(TOKEN_KEY, token);
  },

  remove: (): void => {
    localStorage.removeItem(TOKEN_KEY);
  },
};

function isExpired(token: string): boolean {
  const payload = decodeJwtPayload(token);

  if (!payload?.exp) {
    return true;
  }

  return payload.exp * 1000 <= Date.now();
}

function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const base64Url = token.split(".")[1];

    if (!base64Url) {
      return null;
    }

    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(window.atob(base64)) as JwtPayload;
  } catch {
    return null;
  }
}
