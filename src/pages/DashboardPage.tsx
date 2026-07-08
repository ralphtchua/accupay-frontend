import { useEffect, useMemo, useState } from "react";
import type { DashboardStats, Employee, Filing } from "@/types/domain";
import { getDashboardStats, setCheckedIn } from "@/lib/api";
import { getMyFilings } from "@/services/FilingsService";
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
  const title =
    f.kind === "Leave"
      ? "Leave Filing"
      : f.kind === "Overtime"
        ? "Overtime Filing"
        : `Time Log Filing${f.timelogSubtype ? ` ${f.timelogSubtype}` : ""}`;
  const time =
    f.kind === "TimeLog"
      ? fmtTime12(f.startTime)
      : `${fmtTime12(f.startTime)}→${fmtTime12(f.endTime)}`;
  return `${title} - ${fmtTableDate(f.filingDate)} ${time}`;
}

export function DashboardPage() {
  const { notify } = useToast();

  const [me, setMe] = useState<User>();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [filings, setFilings] = useState<Filing[]>([]);
  const [loading, setLoading] = useState(true);

  // No backend check-in endpoint yet, so this is session-local: we stamp the
  // real time the moment the user checks in, rather than a hardcoded value.
  const [checkedIn, setChecked] = useState(false);
  const [checkInTime, setCheckInTime] = useState<string | null>(null);
  const [now, setNow] = useState(liveClock());
  const { isAuth, removeToken } = useAuth();

  // Load dashboard data once.
  useEffect(() => {
    if (!isAuth) {
      setMe(undefined);
      return;
    }
    let alive = true;
    (async () => {
      await getCurrentEmployee().then(setMe);
      const [s, f] = await Promise.all([
        getDashboardStats("1"),
        getMyFilings().catch(() => [] as Filing[]),
      ]);
      if (!alive) return;
      setStats(s);
      setFilings(f);
      setLoading(false);
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

  const today = useMemo(() => fmtHeaderDate(), []);
  const firstName = me?.firstName;
  // Pending card is derived from the real filings; hour cards stay on mock.
  const pendingCount = filings.filter((f) => f.status === "Pending").length;

  async function toggleCheck() {
    const next = !checkedIn;
    await setCheckedIn(next);
    setChecked(next);
    setCheckInTime(next ? fmtClockTime() : null);
    notify(
      next
        ? "Checked in — have a great shift!"
        : "Checked out — your time has been logged",
    );
  }

  if (loading || !stats) {
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
              color: checkedIn ? "var(--ao-success)" : "var(--ao-muted)",
              marginTop: 4,
            }}
          >
            {checkedIn ? `Checked in · ${checkInTime}` : "Not checked in yet"}
          </div>
        </div>
        <button
          onClick={toggleCheck}
          className="ao-btn"
          style={{
            height: 44,
            width: 140,
            color: "#fff",
            font: "700 15px var(--ao-font)",
            background: checkedIn ? "var(--ao-danger)" : "var(--ao-success)",
          }}
        >
          {checkedIn ? "Check Out" : "Check In"}
        </button>
      </div>

      {/* Stat cards */}
      <div style={{ display: "flex", gap: 16, marginBottom: 18 }}>
        <StatCard
          label="This week"
          value={stats.weekHours}
          tooltip="Total hours you've logged in the current work week (Mon–Sun), counting approved time logs only."
        />
        <StatCard
          label="Overtime"
          value={stats.overtimeHours}
          tooltip="Approved overtime hours filed this week, on top of your standard hours. Pending OT isn't counted yet."
        />
        <StatCard
          label="Pending approval"
          value={String(pendingCount)}
          valueColor="var(--ao-pending)"
          tooltip="Number of your filings (time log, overtime & leave) still waiting on an approver's decision."
        />
      </div>

      {/* Recent filing activity */}
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
            Recent Filing Activities
          </div>
          <div
            style={{
              font: "500 11px var(--ao-font)",
              color: "var(--ao-muted-2)",
            }}
          >
            Latest 15 · most recent first
          </div>
        </div>
        {filings.slice(0, 15).map((f) => (
          <div
            key={f.id}
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
              {filingLabel(f)}
            </span>
            <Chip status={f.status} />
          </div>
        ))}
      </div>
    </div>
  );
}
