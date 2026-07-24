import type { ViewGroup } from '@/types/domain';

/* =====================================================================
   Navigation model — ported from the prototype's navDefs. Each view
   group (employee / approver / admin) has its own sidebar sections.
   `path` maps to the React Router route.
   ===================================================================== */

export interface NavItem { kind: 'item'; label: string; path: string; }
export interface NavHeader { kind: 'header'; label: string; }
export type NavNode = NavItem | NavHeader;

export const NAV: Record<ViewGroup, NavNode[]> = {
  employee: [
    { kind: 'header', label: 'TIME & ATTENDANCE' },
    { kind: 'item', label: 'Dashboard', path: '/dashboard' },
    { kind: 'item', label: 'Time Logs', path: '/timelogs' },
    { kind: 'item', label: 'My Requests', path: '/myrequests' },
    { kind: 'item', label: 'My Leave Balances', path: '/leavebalances' },
    { kind: 'header', label: 'FILINGS' },
    { kind: 'item', label: 'Add Time Log', path: '/addlog' },
    { kind: 'item', label: 'File Overtime', path: '/overtime' },
    { kind: 'item', label: 'File Leave', path: '/leave' },
    { kind: 'header', label: 'ACCOUNT' },
    { kind: 'item', label: 'My Profile', path: '/profile' },
  ],
  admin: [
    { kind: 'header', label: 'APPROVALS' },
    { kind: 'item', label: 'Approvals', path: '/approvals' },
    { kind: 'item', label: 'History', path: '/history' },
    { kind: 'header', label: 'PEOPLE' },
    { kind: 'item', label: 'Employees', path: '/employees' },
    { kind: 'item', label: 'Approvers', path: '/approvers' },
    { kind: 'item', label: 'Roles & Permissions', path: '/roles' },
    { kind: 'header', label: 'SYSTEM' },
    { kind: 'item', label: 'Settings', path: '/settings' },
    { kind: 'header', label: 'ACCOUNT' },
    { kind: 'item', label: 'My Profile', path: '/profile' },
  ],
};

/** Page titles shown in the header, keyed by route path. */
export const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/timelogs': 'My Time Logs',
  '/myrequests': 'My Requests',
  '/leavebalances': 'My Leave Balances',
  '/addlog': 'Add Time Log',
  '/overtime': 'File Overtime',
  '/leave': 'Request Leave',
  '/profile': 'My Profile',
  '/approvals': 'Approvals',
  '/history': 'Approval History',
  '/employees': 'Employees',
  '/approvers': 'Approvers',
  '/roles': 'Roles & Permissions',
  '/settings': 'Settings',
};

/** Default landing route when switching into each view. */
export const VIEW_DEFAULT_ROUTE: Record<ViewGroup, string> = {
  employee: '/dashboard',
  admin: '/approvals',
};
