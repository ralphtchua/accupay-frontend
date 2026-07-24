import type { Settings } from '@/types/domain';

/* =====================================================================
   Mock seed data — the last remnant, used by src/lib/api.ts for the
   Settings screen (the only feature still without a real backend
   endpoint). Everything else now comes from the real C# API via the
   services under src/services.
   ===================================================================== */

export const MOCK_SETTINGS: Settings = {
  timezone: 'GMT+8',
  workWeek: 'Mon-Fri',
  standardHoursDay: 8,
  emailTimelog: true,
  emailOvertime: true,
  emailLeave: true,
  autoRemind48h: false,
  accupayConnected: true,
  accupayRealtimeSync: true,
  accupayLastSyncAt: '2026-06-30T06:00:00+08:00',
  accupayLastRecordCount: 482,
};
