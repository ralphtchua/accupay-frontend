# Access Offshoring — Time & Attendance (Frontend)

React + Vite + TypeScript implementation of the Rev 3 prototype. **All
screens are built** against a typed mock data layer — no backend required
to run it. When the C# API is ready, you swap one file (`src/lib/api.ts`)
from mocks to `fetch()` calls and everything keeps working.

## Screens (all implemented)

**Employee view:** Dashboard (live clock, check in/out, stats, recent
activity), Time Logs (date filter + CSV export), My Requests (status
filter), My Leave Balances, Add Time Log, File Overtime, File Leave
(day/hour modes), My Profile (+ change password).

**Approver view:** Approvals inbox (approve/decline with confirm),
Approval History.

**Admin view:** Employees directory (search + detail panel + reset
password), Roles & Permissions (live toggle matrix), Settings (general,
email notifications, Accupay integration with simulated sync).

Use the **View as** switch in the header to move between the three shells.

## Quick start

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check (strict) + production build to dist/
npm run preview  # serve the production build
```

Open `/login` and click **Sign In** to enter the app (auth is wired in a
later phase). Use the **View as** switch in the header to preview the
Employee / Approver / Admin shells.

## Why these choices

- **Vite + TypeScript** — fast dev server, strict typing across the
  domain model, drop-in for the team's workflow.
- **Plain CSS + design tokens** — every color, radius, shadow, and font
  value in `src/styles/tokens.css` is lifted verbatim from the prototype,
  so the UI is a pixel match and the brand can be re-themed in one file.
  No CSS framework to fight for fidelity.

## Project structure

```
src/
  assets/        logo
  styles/        tokens.css (design system) + global.css (shared classes)
  types/         domain.ts — types mirroring the MySQL schema
  data/          mock.ts — seed data lifted from the prototype
  lib/
    api.ts       ** the single integration seam ** (mocks today, C# later)
    format.ts    date/time/chip helpers ported from the prototype
  components/     ui.tsx, Toast.tsx, ConfirmModal.tsx
  layout/         Sidebar, Header, AppLayout, nav config, view context
  pages/          DashboardPage (built), LoginPage, PlaceholderPage
  AppRoutes.tsx   route table
  main.tsx        entry
```

## Connecting the C# backend (later phase)

The whole app talks to the backend through **`src/lib/api.ts`** only.
Each function currently resolves from `src/data/mock.ts`. To go live:

1. Expose the ASP.NET Core API through ngrok.
2. Set `VITE_API_URL` to the tunnel URL (e.g. in a `.env` file):
   ```
   VITE_API_URL=https://your-subdomain.ngrok-free.app
   ```
3. Replace each function body in `api.ts` with a `fetch()` to the matching
   endpoint (a commented `http<T>()` helper is already in the file).

No component or page changes are needed — the types in `src/types/domain.ts`
are the shared contract between this frontend and the database schema.

## Accessibility floor

Visible keyboard focus, `prefers-reduced-motion` respected, semantic
status roles on the toast. Carried forward as new screens are built.
