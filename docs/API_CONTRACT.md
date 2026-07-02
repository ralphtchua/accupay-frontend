# Access Offshoring API — Contract Guide

Companion to `openapi.yaml` (OpenAPI 3.1, validated). This explains how the
endpoints map to screens, the database, and the React app, so the C# and
React tracks stay aligned.

The machine-readable `openapi.yaml` is the source of truth. View it
interactively at https://editor.swagger.io (File → Import file), or generate
a C# client/server from it (see "Using the spec" below).

---

## Conventions

- **Auth:** Bearer JWT in `Authorization`, except `POST /api/auth/login`.
- **IDs are strings.** The DB uses `BIGINT`; serialize as strings so large
  IDs don't lose precision in JavaScript.
- **Dates** `YYYY-MM-DD`; **times** `HH:mm` (24h); **timestamps** RFC-3339.
- **Lists** return `{ data, total }` so pagination can be added later
  without breaking callers.
- **Errors** use one shape (`status`, `title`, optional `detail`, optional
  field `errors`). Validation failures populate `errors`.

---

## Endpoint map (38 endpoints)

### Auth
| Method | Path | Backs | Notes |
|---|---|---|---|
| POST | `/api/auth/login` | Login screen | Returns JWT + current user. Public. |
| GET | `/api/auth/me` | App boot | Current user, view group, permission codes. |
| POST | `/api/auth/change-password` | Change-password modal | Self-service. |

### Dashboard & Time
| Method | Path | Backs |
|---|---|---|
| GET | `/api/dashboard` | The three stat cards |
| GET | `/api/time/status` | "Checked in · 8:02 AM" line |
| POST | `/api/time/check-in` | Check In button |
| POST | `/api/time/check-out` | Check Out button |
| GET | `/api/time/entries?from&to` | Time Logs table (date filter) |

> The dashboard's recent-activity list reuses `GET /api/filings/mine`.

### Filings
| Method | Path | Backs |
|---|---|---|
| GET | `/api/filings/mine?status&kind` | My Requests + dashboard activity |
| POST | `/api/filings/timelog` | Add Time Log form |
| POST | `/api/filings/overtime` | File Overtime form |
| POST | `/api/filings/leave` | File Leave form |
| GET | `/api/filings/pending` | Approvals inbox |
| GET | `/api/filings/history` | Approval History |
| POST | `/api/filings/{id}/approve` | Approve button |
| POST | `/api/filings/{id}/decline` | Decline button |

All three create endpoints set status `Pending` and route to the
employee's approvers for that filing type (see `filing_approvers`). They
also generate one-click email approval tokens (`filing_approval_tokens`).

### Leave
| Method | Path | Backs |
|---|---|---|
| GET | `/api/leave/balances` | Leave balance cards |
| GET | `/api/leave/types` | Leave-type dropdowns |
| POST/PUT | `/api/leave/types[/{id}]` | Admin: manage leave types + accrual |

### Employees (directory + detail)
| Method | Path | Backs |
|---|---|---|
| GET | `/api/employees?q&status` | Directory list/search |
| POST | `/api/employees` | + Add employee |
| GET/PUT | `/api/employees/{id}` | Employee detail |
| PUT | `/api/employees/{id}/role` | Role dropdown |
| GET/PUT | `/api/employees/{id}/approvers` | Approver chips |
| POST | `/api/employees/{id}/reset-password` | Reset password modal |

### Admin reference data
| Method | Path | Backs |
|---|---|---|
| GET/POST | `/api/employee-types` | Customizable employee types |
| GET | `/api/clients` | Client dropdowns |
| GET | `/api/roles` | Role lists |
| GET/PUT | `/api/roles/{id}/permissions` | Roles & Permissions matrix |
| GET/PUT | `/api/settings` | Settings panels |

### Accupay
| Method | Path | Backs |
|---|---|---|
| GET | `/api/accupay/status` | Integration panel (connected, last sync) |
| POST | `/api/accupay/sync` | Manual sync; pushes approved, unsynced records |

---

## How responses map to the frontend

The schemas in `openapi.yaml` are 1:1 with `src/types/domain.ts`. When the
backend is live, each function in `src/lib/api.ts` swaps its mock body for a
`fetch()` — no component changes:

| `api.ts` function | Endpoint |
|---|---|
| `getCurrentEmployee()` | `GET /api/auth/me` |
| `getDashboardStats(id)` | `GET /api/dashboard` |
| `getMyFilings(id)` | `GET /api/filings/mine` |
| `getTimeEntries(id, from, to)` | `GET /api/time/entries` |
| `getLeaveBalances(id)` | `GET /api/leave/balances` |
| `setCheckedIn(true/false)` | `POST /api/time/check-in` / `check-out` |

> Note: today these take an `employeeId` argument from mock data. Against the
> real API the current user comes from the JWT, so the server ignores/derives
> the employee — the argument can be dropped when wiring is done.

---

## Permissions

`GET /api/auth/me` returns the role's permission codes (`dashboard`,
`addedit`, `filing`, `directory`, `approve`, `accupay`). The frontend uses
these to show/hide nav, **and the server must enforce them** on each
endpoint — client-side checks are convenience only. Mapping:

- `approve` → `/api/filings/pending|history|{id}/approve|decline`
- `directory` → `/api/employees*`
- `accupay` → `/api/accupay/*`
- `filing` → the three `POST /api/filings/*`
- Admin reference-data writes (`roles`, `settings`, `employee-types`,
  `leave/types`) require an admin-group role.

---

## Using the spec (C# side)

The contract is designed to drive code generation so the server can't drift:

- **Generate a server stub / models** with NSwag or Swashbuckle's reverse
  flow, or generate a typed client with `openapi-generator` (`csharp`).
- Or build controllers by hand and add Swashbuckle so your running API's
  generated Swagger can be **diffed against this file** in CI to catch drift.

Either way, keep `openapi.yaml` the single source of truth: change it first,
regenerate, then implement.

---

## Open questions to confirm before implementation

1. **Approver identity for the demo "Approver" view.** The prototype's
   Approver view is keyed by client (e.g. "Acme Corp") rather than a person.
   Confirm whether an approver is always an employee/user, or can be an
   external client contact (email only). This affects `/api/filings/pending`
   filtering.
2. **Time-entry editing.** The prototype only *adds* missed entries via a
   filing. Confirm there's no direct edit/delete of `time_entries` (the
   contract currently exposes none).
3. **Pagination thresholds.** Lists return `{ data, total }` but no
   `page/limit` params yet. Confirm expected data volumes; I'll add paging
   params if any list can exceed a few hundred rows.
