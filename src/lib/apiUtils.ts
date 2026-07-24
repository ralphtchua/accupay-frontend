import type { AxiosError } from 'axios';

/* =====================================================================
   Shared API helpers used by every service — unwrap a list response and
   turn an error into a human-readable message. Kept here so the parsing
   rules live in one place instead of being copy-pasted per service.
   ===================================================================== */

/** Unwrap a list payload: a bare array, or a { items | data | results } wrapper. */
export function itemsOf<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  const p = payload as { items?: T[]; data?: T[]; results?: T[] } | null;
  return p?.items ?? p?.data ?? p?.results ?? [];
}

/**
 * A human-readable message from an API error. Prefers the backend's
 * business-rule message ({ Error } on a 400), then a short string body,
 * then a generic 500 note, and finally the caller's fallback.
 */
export function apiError(err: unknown, fallback = 'Request failed.'): string {
  const e = err as AxiosError<Record<string, string> | string>;
  const data = e.response?.data;
  if (data && typeof data === 'object') {
    const d = data as Record<string, string>;
    const msg = d.Error ?? d.error ?? d.title ?? d.message;
    if (msg) return String(msg);
  }
  if (typeof data === 'string' && data.trim() && data.length < 300) return data.trim();
  if (e.response?.status === 500) {
    return 'Server error (500). Check the API console for the stack trace.';
  }
  return e.message || fallback;
}
