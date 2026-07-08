# Backend work needed for the Employees page + per-employee approvers

The Employees detail screen (directory + detail) is wired to the real API for
**read** only. Three features in the design have **no backend** today and need
new endpoints in `AccuPay.Web` (plus entities/repos in `AccuPay.Core` /
`AccuPay.Infrastructure`). This doc specifies each so they can be built, after
which the frontend controls (currently disabled) can be turned on.

Current state (verified): `grep -ri "approver"` over the API returns **0**
matches; there is no reset-password endpoint; and no endpoint maps an employee
to their user account or role.

---

## 1. Per-employee approvers (the big one)

Goal: assign each employee one or more approvers **per filing type**, and route
approvals so an approver only sees/acts on filings from employees who list them
as an approver (replacing today's company/organization-wide scope).

### 1a. Storage

New table `employee_approver` (or extend an existing filing-routing table):

| Column          | Type        | Notes                                            |
|-----------------|-------------|--------------------------------------------------|
| `RowID`         | BIGINT PK   |                                                  |
| `OrganizationID`| BIGINT FK   | → `organization.RowID`                            |
| `EmployeeID`    | BIGINT FK   | → `employee.RowID` (the filer)                    |
| `FilingType`    | ENUM/string | `TimeLog` \| `Overtime` \| `Leave`                |
| `ApproverEmployeeID` | BIGINT FK | → `employee.RowID` (the approver)              |

Unique index on (`EmployeeID`, `FilingType`, `ApproverEmployeeID`).
Approver is modeled as an **employee** (matches how the approver logs in — a
user linked to an employee). If you prefer email-based approvers, store
`ApproverEmail` instead and resolve to a user at query time.

### 1b. Endpoints (`EmployeesController`)

```
GET  /api/employees/{id}/approvers        [Permission: EmployeeRead]
     → { timeLog: ApproverDto[], overtime: ApproverDto[], leave: ApproverDto[] }

PUT  /api/employees/{id}/approvers        [Permission: EmployeeUpdate]
     body: { timeLog: int[], overtime: int[], leave: int[] }   // approver employee ids
     → replaces the set for that employee
```

`ApproverDto = { employeeId: int, name: string, email: string }`.

### 1c. Approval routing change (the important part)

Today the approver inbox is org-scoped:

```csharp
// OvertimeService.PaginatedList / LeaveService.PaginatedList
var list = await _repository.GetPaginatedListAsync(options, _currentUser.OrganizationId);
```

Change it to "filings whose employee lists the current user as an approver for
that filing type". The current user's employee id is `_currentUser.EmployeeId`.

```
overtime inbox  = overtimes where overtime.EmployeeID IN
                  (SELECT EmployeeID FROM employee_approver
                   WHERE FilingType = 'Overtime'
                     AND ApproverEmployeeID = @currentEmployeeId)
```

Add the same filter to `LeaveService.PaginatedList` (FilingType = 'Leave').

**Also enforce on the decision (write) path** — this is currently missing even
for org scope. In `OvertimeService.Update` / `LeaveService.Update`, before
saving, verify the current user is an approver of the filing's employee for that
type; otherwise throw `BusinessLogicException` (→ 400). Without this, an approver
could approve any filing by id.

### 1d. Frontend (already built, currently disabled)

`EmployeesPage` shows the three approver lists disabled. Once 1b exists, wire
`getApprovers(id)` / `setApprovers(id, {...})` and remove the disabled state.
`ApprovalsPage` needs no change — it already calls the org list endpoints, which
will now return the approver-scoped set.

---

## 2. Employee role assignment (Role dropdown)

Problem: roles live on the **user account** (`AspNetUser`), but nothing maps an
employee → their user, so the page can't read or set an employee's role.

Add to `EmployeesController`:

```
GET  /api/employees/{id}/role     [Permission: RoleRead]
     → { userId: int?, roleId: int?, roleName: string? }   // null if no user/role

PUT  /api/employees/{id}/role     [Permission: RoleUpdate]
     body: { roleId: int? }       // null clears the role
```

Implementation: look up `AspNetUser` where `EmployeeId = {id}` (in the current
org). Reuse the existing user-role logic (`RoleService.UpdateUserRoles` /
`UserRoleIdData(organizationId, userId, roleId)`) so org scoping is consistent.
The frontend already has a role dropdown (disabled) and `RolesService.getRoles()`
for the options.

---

## 3. Reset password

No admin reset endpoint exists. Add:

```
POST /api/employees/{id}/reset-password   [Permission: UserUpdate]
     body: { password?: string }          // omit to auto-generate
     → { password: string }               // the value that was set
```

Implementation: find the `AspNetUser` for the employee, then
`UserManager.GeneratePasswordResetTokenAsync` + `ResetPasswordAsync` (this is the
same mechanism `AccountService.Register` already uses). Return the new password
so the admin can share it, or trigger `UserEmailService.SendInvitation` instead.

---

## Summary

| Feature (screenshot)     | Status now        | Needs |
|--------------------------|-------------------|-------|
| Directory + detail read  | ✅ wired           | —     |
| Client field             | ❌ not returned    | add Client/Org name to `EmployeeDto` |
| Reset password           | ❌ no endpoint     | §3 |
| Role dropdown            | ❌ no employee→user/role link | §2 |
| Approvers (per employee) | ❌ no concept      | §1 |
| Per-employee approval routing | ❌ org-scoped today | §1c |
