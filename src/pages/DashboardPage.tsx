import { useEffect, useMemo, useState } from "react";
import type { Filing } from "@/types/domain";
import { getMyFilings } from "@/services/FilingsService";
import {
  checkIn,
  checkOut,
  getTodaysLogState,
  getMyTimeLogs,
  type TimeLogEntry,
} from "@/services/TimeLogsService";
import { Chip, StatCard } from "@/components/ui";
import { useToast } from "@/components/Toast";
import {
  fmtClockTime,
  fmtHeaderDate,
  fmtTableDate,
  fmtTime12,
  liveClock,
} from "@/lib/format";
import { getCurrentEmployee } from "@/services/AuthService";
import { User } from "@/interfaces/User";
import { useAuth } from "../hooks/UseLocalStorage";
import { tokenService } from "@/services/TokenService";
/* =====================================================================
   Dashboard — first fully-built screen.
   Live wall clock, check in/out with confirm modal, three stat cards
   with tooltips, and the recent filing activity list. Data comes from
   the typed api layer (mocks today, C# tomorrow).
   ===================================================================== */

function filingLabel(f: Filing): string {
  const date = fmtTableDate(f.filingDate);
  // Only show an in→out range when both times exist. Whole-day leaves have
  // neither, so they'd otherwise render a dangling "→".
  const range =
    f.startTime && f.endTime ? ` ${fmtTime12(f.startTime)}→${fmtTime12(f.endTime)}` : "";

  if (f.kind === "TimeLog") {
    const sub = f.timelogSubtype ? ` ${f.timelogSubtype}` : "";
    return `Time Log Filing${sub} - ${date} ${fmtTime12(f.startTime)}`;
  }
  if (f.kind === "Leave") {
    const type = f.leaveType ? ` (${f.leaveType})` : "";
    return `Leave Filing${type} - ${date}${range}`;
  }
  return `Overtime Filing - ${date}${range}`;
}

export function DashboardPage() {
  const { notify } = useToast();

  const [me, setMe] = useState<User>();
  const [filings, setFilings] = useState<Filing[]>([]);
  const [timeLogs, setTimeLogs] = useState<TimeLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Real check in/out against POST/PUT /api/self-service/timelogs; on load we
  // restore an open check-in from GET /api/self-service/timelogs/employee, so
  // the state is fully backend-sourced and survives a refresh (no localStorage).
  const [checkedIn, setChecked] = useState(false);
  const [checkInTime, setCheckInTime] = useState<string | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);
  const [doneToday, setDoneToday] = useState(false); // already checked in + out today
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(liveClock());
  const { isAuth } = useAuth();

  // This login can only clock in/out if it has a linked employee record.
  const canCheck = tokenService.getEmployeeId() != null;

  // Load dashboard data once.
  useEffect(() => {
    if (!isAuth) {
      setMe(undefined);
      return;
    }
    let alive = true;
    (async () => {
      try {
        // Each call is resilient: a failure (e.g. a 403 on a not-permitted
        // endpoint) must not leave the page stuck on "Loading…".
        const [meRes, f, tl] = await Promise.all([
          getCurrentEmployee().catch(() => undefined),
          getMyFilings().catch(() => [] as Filing[]),
          getMyTimeLogs().catch(() => [] as TimeLogEntry[]),
        ]);
        if (!alive) return;
        if (meRes) setMe(meRes);
        setFilings(f);
        setTimeLogs(tl);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Tick the live clock every second.
  useEffect(() => {
    const t = setInterval(() => setNow(liveClock()), 1000);
    return () => clearInterval(t);
  }, []);

  // Restore today's check-in/out state from the backend (survives refresh, and
  // enforces one check-in/out per day).
  useEffect(() => {
    if (!isAuth || !canCheck) return;
    let alive = true;
    getTodaysLogState().then((s) => {
      if (!alive) return;
      if (s.state === "open") {
        setChecked(true);
        setOpenId(s.id);
        setCheckInTime(fmtClockTime(new Date(s.startISO)));
      } else if (s.state === "done") {
        setDoneToday(true);
      }
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const today = useMemo(() => fmtHeaderDate(), []);
  const firstName = me?.firstName;
  const pendingCount = filings.filter((f) => f.status === "Pending").length;

  // "This week" worked hours (from completed check-ins) and approved overtime
  // hours, both for the current Mon-Sun week — computed from the real data.
  const { weekHours, overtimeHours } = useMemo(() => {
    const now = new Date();
    const dow = now.getDay(); // 0 = Sun
    const monday = new Date(now);
    monday.setHours(0, 0, 0, 0);
    monday.setDate(now.getDate() + (dow === 0 ? -6 : 1 - dow));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    const inWeek = (iso: string) => {
      const d = new Date(iso);
      return d >= monday && d <= sunday;
    };

    let worked = 0;
    for (const t of timeLogs) {
      if (!t.startTime || !t.endTime || !inWeek(t.startTime)) continue;
      const h = (new Date(t.endTime).getTime() - new Date(t.startTime).getTime()) / 3_600_000;
      if (h > 0) worked += h;
    }

    let ot = 0;
    for (const f of filings) {
      if (f.kind !== "Overtime" || f.status !== "Approved") continue;
      if (!inWeek(`${f.filingDate}T00:00:00`)) continue;
      ot += f.hours ?? 0;
    }

    const fmt = (h: number) => `${h.toFixed(1)} h`;
    return { weekHours: fmt(worked), overtimeHours: fmt(ot) };
  }, [timeLogs, filings]);

  // Merge filings + real time logs into one activity feed, newest first.
  const activity = useMemo(() => {
    const hhmm = (iso: string) => {
      const d = new Date(iso);
      return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    };
    const fromFilings = filings.map((f) => ({
      key: `f-${f.id}`,
      sortKey: `${f.filingDate}T00:00:00`,
      label: filingLabel(f),
      status: f.status as string,
    }));
    const fromLogs = timeLogs.map((t) => {
      const day = t.date.split("T")[0];
      const inT = t.startTime ? fmtTime12(hhmm(t.startTime)) : "";
      const outT = t.endTime ? fmtTime12(hhmm(t.endTime)) : "";
      return {
        key: `t-${t.id}`,
        sortKey: t.startTime ?? `${day}T00:00:00`,
        label: `Time Log - ${fmtTableDate(day)} ${inT}${outT ? `→${outT}` : " → in progress"}`,
        status: t.endTime ? "Logged" : "Active",
      };
    });
    return [...fromFilings, ...fromLogs].sort((a, b) =>
      a.sortKey < b.sortKey ? 1 : a.sortKey > b.sortKey ? -1 : 0,
    );
  }, [filings, timeLogs]);

  async function toggleCheck() {
    if (busy || !canCheck || doneToday) return;
    setBusy(true);
    try {
      if (!checkedIn) {
        const res = await checkIn();
        setOpenId(res.id);
        setChecked(true);
        setCheckInTime(fmtClockTime());
        notify("Checked in — have a great shift!");
      } else {
        if (openId != null) await checkOut(openId);
        setOpenId(null);
        setChecked(false);
        setCheckInTime(null);
        setDoneToday(true); // one check-in/out per day
        notify("Checked out — your time has been logged");
      }
    } catch (e) {
      notify((e as Error).message || "Could not update your time log.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div
        style={{ font: "500 14px var(--ao-font)", color: "var(--ao-muted)" }}
      >
        Loading your dashboard…
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 880 }}>
      <div style={{ font: "700 22px var(--ao-font)", marginBottom: 2 }}>
        Good day, {firstName}
      </div>
      <div
        style={{
          font: "400 14px var(--ao-font)",
          color: "var(--ao-muted)",
          marginBottom: 20,
        }}
      >
        Here's your attendance at a glance.
      </div>

      {/* Clock + check in/out */}
      <div
        className="ao-card"
        style={{
          padding: "24px 26px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 18,
        }}
      >
        <div>
          <div
            style={{
              font: "500 13px var(--ao-font)",
              color: "var(--ao-muted)",
            }}
          >
            {today}
          </div>
          <div
            style={{
              font: "800 40px var(--ao-font)",
              color: "var(--ao-primary)",
              lineHeight: 1.1,
              letterSpacing: "-1px",
            }}
          >
            {now}
          </div>
          <div
            style={{
              font: "600 13px var(--ao-font)",
              color: checkedIn || doneToday ? "var(--ao-success)" : "var(--ao-muted)",
              marginTop: 4,
            }}
          >
            {doneToday
              ? "Checked out for today"
              : checkedIn
                ? `Checked in · ${checkInTime}`
                : "Not checked in yet"}
          </div>
        </div>
        <button
          onClick={toggleCheck}
          disabled={busy || !canCheck || doneToday}
          title={
            doneToday
              ? "You've already checked in and out today"
              : canCheck
                ? ""
                : "This login has no linked employee record."
          }
          className="ao-btn"
          style={{
            height: 44,
            width: 140,
            color: "#fff",
            font: "700 15px var(--ao-font)",
            background: doneToday
              ? "#94a3b8"
              : checkedIn
                ? "var(--ao-danger)"
                : "var(--ao-success)",
            opacity: busy || !canCheck || doneToday ? 0.6 : 1,
            cursor: busy || !canCheck || doneToday ? "default" : "pointer",
          }}
        >
          {busy ? "…" : doneToday ? "Checked out" : checkedIn ? "Check Out" : "Check In"}
        </button>
      </div>

      {/* Stat cards */}
      <div style={{ display: "flex", gap: 16, marginBottom: 18 }}>
        <StatCard
          label="This week"
          value={weekHours}
          tooltip="Hours from your completed check-ins this work week (Mon-Sun)."
        />
        <StatCard
          label="Overtime"
          value={overtimeHours}
          tooltip="Approved overtime hours for this work week (Mon-Sun). Pending OT isn't counted."
        />
        <StatCard
          label="Pending approval"
          value={String(pendingCount)}
          valueColor="var(--ao-pending)"
          tooltip="Number of your filings (time log, overtime & leave) still waiting on an approver's decision."
        />
      </div>

      {/* Recent activity: filings + time logs */}
      <div className="ao-card" style={{ padding: "18px 20px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            marginBottom: 6,
          }}
        >
          <div style={{ font: "700 15px var(--ao-font)" }}>
            Recent Activity
          </div>
          <div
            style={{
              font: "500 11px var(--ao-font)",
              color: "var(--ao-muted-2)",
            }}
          >
            Filings & time logs · most recent first
          </div>
        </div>
        {activity.length === 0 ? (
          <div
            style={{
              font: "500 13px var(--ao-font)",
              color: "var(--ao-muted)",
              padding: "12px 0",
            }}
          >
            No activity yet.
          </div>
        ) : (
          activity.map((a) => (
            <div
              key={a.key}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 14,
                padding: "12px 0",
                borderBottom: "1px solid var(--ao-border-soft)",
              }}
            >
              <span
                style={{
                  font: "500 13px var(--ao-font)",
                  color: "var(--ao-text-2)",
                }}
              >
                {a.label}
              </span>
              <Chip status={a.status} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
