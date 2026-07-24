export interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  type: string;
  /** Linked employee RowID (returned by the account endpoint once it exposes it). */
  employeeId?: number | null;
  /** Friendly employee number/code, e.g. 'AO-00481'. Backend to expose on /api/account. */
  employeeNo?: string | null;
  /** Employee job title / position. Backend to expose on /api/account. */
  title?: string | null;
  /** HR classification, e.g. 'Independent contractor' — a label only, no
      effect on permissions. Backend to expose on /api/account. */
  employeeType?: string | null;
}
