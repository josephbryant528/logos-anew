'use client'

import { useState, useEffect } from "react";
import { BookOpen, MessageCircle, TrendingUp, CheckCircle2, Circle, ChevronLeft, ChevronRight } from "lucide-react";

const UI   = "'Inter', system-ui, sans-serif";
const BODY = "'Lora', serif";
const MONO = "'DM Mono', monospace";

// ── Data types ─────────────────────────────────────────────────────────────────

interface DayLog {
  date: string;   // "YYYY-MM-DD"
  reading: boolean;
  prayer: boolean;
  notes?: string;
}

interface DisciplinesData {
  logs: DayLog[];
}

const DISC_KEY = "verbum_disciplines";

function loadData(): DisciplinesData {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(DISC_KEY) : null;
    return raw ? JSON.parse(raw) : { logs: [] };
  } catch { return { logs: [] }; }
}

function saveData(data: DisciplinesData) {
  localStorage.setItem(DISC_KEY, JSON.stringify(data));
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// ── Main dashboard ─────────────────────────────────────────────────────────────

export function DisciplinesDashboard() {
  const [data, setData]     = useState<DisciplinesData>({ logs: [] });
  const [today]             = useState(todayStr);

  useEffect(() => {
    setData(loadData());
  }, []);

  useEffect(() => {
    saveData(data);
  }, [data]);

  const todayLog   = data.logs.find(l => l.date === today) ?? { date: today, reading: false, prayer: false };

  const toggleToday = (field: "reading" | "prayer") => {
    setData(prev => {
      const existing = prev.logs.find(l => l.date === today);
      if (existing) {
        return { ...prev, logs: prev.logs.map(l => l.date === today ? { ...l, [field]: !l[field] } : l) };
      }
      return { ...prev, logs: [...prev.logs, { date: today, reading: false, prayer: false, [field]: true }] };
    });
  };

  // Stats
  const last30 = getLast30Days(today);
  const logsMap = new Map(data.logs.map(l => [l.date, l]));
  const readingStreak = calcStreak(logsMap, today, "reading");
  const prayerStreak  = calcStreak(logsMap, today, "prayer");
  const readingDays   = last30.filter(d => logsMap.get(d)?.reading).length;
  const prayerDays    = last30.filter(d => logsMap.get(d)?.prayer).length;

  // Monthly chart data (last 6 months)
  const monthlyBars = getMonthlyBars(data.logs);

  return (
    <div style={{ fontFamily: UI }}>
      {/* Tinted header band */}
      <div style={{ background: "rgba(46,170,220,0.05)", borderBottom: "1px solid rgba(46,170,220,0.1)", padding: "48px 96px 36px" }}>
        <div style={{ maxWidth: "528px" }}>
          <div style={{ fontFamily: MONO, fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--accent)", marginBottom: "10px" }}>
            Spiritual Formation
          </div>
          <h1 style={{ fontSize: "2rem", fontWeight: 700, color: "var(--foreground)", marginBottom: "6px", lineHeight: 1.2 }}>
            Disciplines
          </h1>
          <p style={{ fontSize: "0.875rem", color: "var(--muted-foreground)", margin: 0 }}>
            Track daily reading and prayer habits over time
          </p>
        </div>
      </div>

      <div style={{ maxWidth: "720px", margin: "0 auto", padding: "40px 96px 120px" }}>

        {/* Today's check-ins */}
        <section style={{ marginBottom: "32px" }}>
          <div style={{ fontFamily: MONO, fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted-foreground)", marginBottom: "14px" }}>
            Today · {formatDate(today)}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <ToggleCard
              icon={<BookOpen size={18} />}
              label="Bible Reading"
              checked={todayLog.reading}
              streak={readingStreak}
              onToggle={() => toggleToday("reading")}
            />
            <ToggleCard
              icon={<MessageCircle size={18} />}
              label="Prayer"
              checked={todayLog.prayer}
              streak={prayerStreak}
              onToggle={() => toggleToday("prayer")}
            />
          </div>
        </section>

        {/* Stats row */}
        <section style={{ marginBottom: "32px" }}>
          <div style={{ fontFamily: MONO, fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted-foreground)", marginBottom: "14px" }}>
            Last 30 Days
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px" }}>
            <StatCard label="Reading days" value={readingDays} unit="/30" />
            <StatCard label="Prayer days" value={prayerDays} unit="/30" />
            <StatCard label="Reading streak" value={readingStreak} unit="d" />
            <StatCard label="Prayer streak" value={prayerStreak} unit="d" />
          </div>
        </section>

        {/* Monthly trend */}
        <section style={{ marginBottom: "32px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
            <TrendingUp size={14} style={{ color: "var(--accent)" }} />
            <span style={{ fontFamily: MONO, fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted-foreground)" }}>
              Monthly Trend
            </span>
          </div>
          <SimpleMonthlyChart bars={monthlyBars} />
        </section>

        {/* Recent log (last 14 days) */}
        <section>
          <div style={{ fontFamily: MONO, fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted-foreground)", marginBottom: "14px" }}>
            Recent Log
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "1px", borderRadius: "8px", overflow: "hidden", border: "1px solid var(--border)" }}>
            {getLast14Days(today).map((date, i) => {
              const log = logsMap.get(date);
              const isToday = date === today;
              return (
                <div key={date} style={{ display: "flex", alignItems: "center", padding: "10px 14px", background: i % 2 === 0 ? "var(--card)" : "var(--background)", gap: "12px" }}>
                  <span style={{ fontFamily: MONO, fontSize: "0.72rem", color: isToday ? "var(--accent)" : "var(--muted-foreground)", width: "90px", flexShrink: 0 }}>
                    {isToday ? "Today" : formatDateShort(date)}
                  </span>
                  <div style={{ display: "flex", gap: "16px", flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      {log?.reading
                        ? <CheckCircle2 size={14} style={{ color: "var(--accent)" }} />
                        : <Circle size={14} style={{ color: "var(--border)" }} />}
                      <span style={{ fontFamily: UI, fontSize: "0.78rem", color: log?.reading ? "var(--foreground)" : "var(--muted-foreground)" }}>Reading</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      {log?.prayer
                        ? <CheckCircle2 size={14} style={{ color: "var(--accent)" }} />
                        : <Circle size={14} style={{ color: "var(--border)" }} />}
                      <span style={{ fontFamily: UI, fontSize: "0.78rem", color: log?.prayer ? "var(--foreground)" : "var(--muted-foreground)" }}>Prayer</span>
                    </div>
                  </div>
                  {log?.notes && (
                    <span style={{ fontFamily: BODY, fontSize: "0.75rem", color: "var(--muted-foreground)", fontStyle: "italic", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {log.notes}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </section>

      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function ToggleCard({ icon, label, checked, streak, onToggle }: {
  icon: React.ReactNode;
  label: string;
  checked: boolean;
  streak: number;
  onToggle: () => void;
}) {
  return (
    <div
      onClick={onToggle}
      style={{
        padding: "18px 20px",
        borderRadius: "8px",
        border: `1px solid ${checked ? "rgba(46,170,220,0.4)" : "var(--border)"}`,
        background: checked ? "rgba(46,170,220,0.06)" : "var(--card)",
        cursor: "pointer",
        transition: "all 0.15s",
        userSelect: "none",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
        <span style={{ color: checked ? "var(--accent)" : "var(--muted-foreground)" }}>{icon}</span>
        {checked
          ? <CheckCircle2 size={18} style={{ color: "var(--accent)" }} />
          : <Circle size={18} style={{ color: "var(--border)" }} />}
      </div>
      <div style={{ fontFamily: UI, fontSize: "0.9rem", fontWeight: 600, color: "var(--foreground)", marginBottom: "3px" }}>{label}</div>
      {streak > 0 ? (
        <div style={{ fontFamily: MONO, fontSize: "0.65rem", color: "var(--accent)" }}>{streak}d streak</div>
      ) : (
        <div style={{ fontFamily: MONO, fontSize: "0.65rem", color: "var(--muted-foreground)" }}>No streak yet</div>
      )}
    </div>
  );
}

function StatCard({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <div style={{ padding: "14px 16px", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--card)" }}>
      <div style={{ fontFamily: MONO, fontSize: "1.4rem", fontWeight: 700, color: "var(--foreground)", lineHeight: 1 }}>
        {value}<span style={{ fontSize: "0.7rem", color: "var(--muted-foreground)", fontWeight: 400 }}>{unit}</span>
      </div>
      <div style={{ fontFamily: UI, fontSize: "0.72rem", color: "var(--muted-foreground)", marginTop: "4px" }}>{label}</div>
    </div>
  );
}

function SimpleMonthlyChart({ bars }: { bars: Array<{ label: string; reading: number; prayer: number }> }) {
  if (bars.length === 0) {
    return (
      <div style={{ padding: "24px", borderRadius: "8px", border: "1px solid var(--border)", textAlign: "center" }}>
        <p style={{ fontFamily: UI, fontSize: "0.875rem", color: "var(--muted-foreground)", fontStyle: "italic", margin: 0 }}>
          No data yet — start logging today
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--card)" }}>
      {/* Legend */}
      <div style={{ display: "flex", gap: "20px", marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <div style={{ width: "10px", height: "10px", borderRadius: "2px", background: "var(--accent)" }} />
          <span style={{ fontFamily: UI, fontSize: "0.72rem", color: "var(--muted-foreground)" }}>Reading</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <div style={{ width: "10px", height: "10px", borderRadius: "2px", background: "rgba(46,170,220,0.3)" }} />
          <span style={{ fontFamily: UI, fontSize: "0.72rem", color: "var(--muted-foreground)" }}>Prayer</span>
        </div>
      </div>
      {/* Bars */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: "12px", height: "80px" }}>
        {bars.map(bar => (
          <div key={bar.label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "3px", height: "100%" }}>
            <div style={{ flex: 1, width: "100%", display: "flex", alignItems: "flex-end", gap: "2px" }}>
              <div title={`Reading: ${bar.reading}%`} style={{ flex: 1, background: "var(--accent)", height: `${Math.max(bar.reading, 2)}%`, borderRadius: "2px 2px 0 0", minHeight: bar.reading > 0 ? "3px" : 0, opacity: 0.9, transition: "height 0.3s" }} />
              <div title={`Prayer: ${bar.prayer}%`} style={{ flex: 1, background: "rgba(46,170,220,0.3)", height: `${Math.max(bar.prayer, 2)}%`, borderRadius: "2px 2px 0 0", minHeight: bar.prayer > 0 ? "3px" : 0, transition: "height 0.3s" }} />
            </div>
            <span style={{ fontFamily: MONO, fontSize: "0.58rem", color: "var(--muted-foreground)" }}>{bar.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function getLast30Days(today: string): string[] {
  return Array.from({ length: 30 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    return d.toISOString().slice(0, 10);
  });
}

function getLast14Days(today: string): string[] {
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    return d.toISOString().slice(0, 10);
  });
}

function calcStreak(logsMap: Map<string, DayLog>, today: string, field: "reading" | "prayer"): number {
  let streak = 0;
  const d = new Date(today);
  while (true) {
    const key = d.toISOString().slice(0, 10);
    if (!logsMap.get(key)?.[field]) break;
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

function getMonthlyBars(logs: DayLog[]): Array<{ label: string; reading: number; prayer: number }> {
  const now = new Date();
  const months: Array<{ label: string; reading: number; prayer: number }> = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year  = d.getFullYear();
    const month = d.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;
    const monthLogs = logs.filter(l => l.date.startsWith(prefix));
    const readingPct = Math.round((monthLogs.filter(l => l.reading).length / daysInMonth) * 100);
    const prayerPct  = Math.round((monthLogs.filter(l => l.prayer).length  / daysInMonth) * 100);
    months.push({
      label: d.toLocaleString("en-US", { month: "short" }),
      reading: readingPct,
      prayer: prayerPct,
    });
  }
  return months;
}

function formatDate(iso: string): string {
  return new Date(iso + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

function formatDateShort(iso: string): string {
  return new Date(iso + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}
