import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from '@/layout/AppLayout';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { TimeLogsPage } from '@/pages/TimeLogsPage';
import { MyRequestsPage } from '@/pages/MyRequestsPage';
import { LeaveBalancesPage } from '@/pages/LeaveBalancesPage';
import { AddTimeLogPage } from '@/pages/AddTimeLogPage';
import { OvertimePage } from '@/pages/OvertimePage';
import { LeavePage } from '@/pages/LeavePage';
import { ProfilePage } from '@/pages/ProfilePage';
import { ApprovalsPage } from '@/pages/ApprovalsPage';
import { HistoryPage } from '@/pages/HistoryPage';
import { EmployeesPage } from '@/pages/EmployeesPage';
import { RolesPage } from '@/pages/RolesPage';
import { SettingsPage } from '@/pages/SettingsPage';

/* =====================================================================
   Routes. All screens are built against the mock api layer; the shell
   wraps every app route. Auth lands on the dashboard.
   ===================================================================== */

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/timelogs" element={<TimeLogsPage />} />
        <Route path="/myrequests" element={<MyRequestsPage />} />
        <Route path="/leavebalances" element={<LeaveBalancesPage />} />
        <Route path="/addlog" element={<AddTimeLogPage />} />
        <Route path="/overtime" element={<OvertimePage />} />
        <Route path="/leave" element={<LeavePage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/approvals" element={<ApprovalsPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/employees" element={<EmployeesPage />} />
        <Route path="/roles" element={<RolesPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
