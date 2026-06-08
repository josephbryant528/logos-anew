'use client'

import { useState, useEffect, useMemo } from "react";
import { BookOpen, MessageCircle, TrendingUp, CheckCircle2, Circle, Map as MapIcon } from "lucide-react";
import { BIBLE_BOOKS } from "../data/scripture";
import { DisciplinesData, DayLog, loadDisciplines, saveDisciplines, todayStr } from "../data/disciplines";
import { ReadingLogModal } from "./ReadingLogModal";
import { PrayerQuickModal } from "./PrayerQuickModal";
import { DayLogModal } from "./DayLogModal";

const UI   = "'Inter', system-ui, sans-serif";
const BODY = "'Lora', serif";
const MONO = "'DM Mono', monospace";

type Modal = "reading" | "prayer" | { type: "day"; date: string } | null;
type ProgressWindow = "year" | "30d" | "all";

interface Props {
  onViewPrayerLog?: () => void;
}

export function DisciplinesDashboard({ onViewPrayerLog }: Props) {
  const [data,   setData]   = useState<DisciplinesData>({ logs: [] });
  const [modal,  setModal]  = useState<Modal>(null);
  const [progressWindow, setProgressWindow] = useState<ProgressWindow>("year");
  const today = todayStr();

  useEffect(() => { setData(loadDisciplines()); }, []);
  useEffect(() => { saveDisciplines(data); }, [data]);

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const logsMap = useMemo(() => new Map(data.logs.map(l => [l.date, l])), [data]);
  const todayLog: DayLog = logsMap.get(today) ?? { date: today, reading: false, prayer: false, readingEntries: [] };

  const upsertLog = (updated: DayLog) => {
    setData(prev => {
      const exists = prev.logs.some(l => l.date === updated.date);
      return {
        ...prev,
        logs: exists
          ? prev.logs.map(l => l.date === updated.date ? updated : l)
          : [...prev.logs, updated],
      };
    });
  };

  const toggleToday = (field: "reading" | "prayer") => {
    upsertLog({ ...todayLog, [field]: !todayLog[field] });
  };

  // ── Stats ─────────────────────────────────────────────────────────────────────

  const last30Days = useMemo(() => getDays(today, 30), [today]);
  const readingStreak = useMemo(() => calcStreak(logsMap, today, "reading"), [logsMap, today]);
  const prayerStreak  = useMemo(() => calcStreak(logsMap, today, "prayer"),  [logsMap, today]);
  const readingDays   = last30Days.filter(d => logsMap.get(d)?.reading).length;
  const prayerDays    = last30Days.filter(d => logsMap.get(d)?.prayer).length;
  const monthlyBars   = useMemo(() => getMonthlyBars(data.logs), [data.logs]);

  // ── Scripture progress ────────────────────────────────────────────────────────

  const progressData = useMemo(() => {
    const now = new Date();
    const cutoff =
      progressWindow === "year" ? `${now.getFullYear()}-01-01` :
      progressWindow === "30d"  ? getDays(today, 30)[29] :
      "0000-00-00";

    const chaptersRead = new Map<string, Set<number>>();
    for (const log of data.logs) {
      if (log.date < cutoff) continue;
      for (const entry of log.readingEntries) {
        if (!chaptersRead.has(entry.book)) chaptersRead.set(entry.book, new Set());
        entry.chapters.forEach(ch => chaptersRead.get(entry.book)!.add(ch));
      }
    }

    let totalChapters = 0;
    let totalRead = 0;
    let booksComplete = 0;

    const books = BIBLE_BOOKS.map(b => {
      const read   = chaptersRead.get(b.name) ?? new Set<number>();
      const pct    = read.size / b.chapters;
      const complete = read.size === b.chapters;
      totalChapters += b.chapters;
      totalRead     += read.size;
      if (complete) booksComplete++;
      return { name: b.name, total: b.chapters, readCount: read.size, pct, complete, testament: b.testament };
    });

    return { books, totalChapters, totalRead, booksComplete };
  }, [data.logs, progressWindow, today]);

  // ── Render ────────────────────────────────────────────────────────────────────

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

        {/* ── Today ── */}
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
              entryCount={todayLog.readingEntries.length}
              onToggle={() => toggleToday("reading")}
              onLog={() => setModal("reading")}
              logLabel="Log Reading"
            />
            <ToggleCard
              icon={<MessageCircle size={18} />}
              label="Prayer"
              checked={todayLog.prayer}
              streak={prayerStreak}
              onToggle={() => toggleToday("prayer")}
              onLog={() => setModal("prayer")}
              logLabel="Add Prayer Request"
            />
          </div>
        </section>

        {/* ── Stats ── */}
        <section style={{ marginBottom: "32px" }}>
          <div style={{ fontFamily: MONO, fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted-foreground)", marginBottom: "14px" }}>
            Last 30 Days
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px" }}>
            <StatCard label="Reading days" value={readingDays} unit="/30" />
            <StatCard label="Prayer days"  value={prayerDays}  unit="/30" />
            <StatCard label="Reading streak" value={readingStreak} unit="d" />
            <StatCard label="Prayer streak"  value={prayerStreak}  unit="d" />
          </div>
        </section>

        {/* ── Monthly trend ── */}
        <section style={{ marginBottom: "32px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
            <TrendingUp size={14} style={{ color: "var(--accent)" }} />
            <span style={{ fontFamily: MONO, fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted-foreground)" }}>
              Monthly Trend
            </span>
          </div>
          <SimpleMonthlyChart bars={monthlyBars} />
        </section>

        {/* ── Scripture progress ── */}
        <section style={{ marginBottom: "32px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <MapIcon size={14} style={{ color: "var(--accent)" }} />
              <span style={{ fontFamily: MONO, fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted-foreground)" }}>
                Scripture Progress
              </span>
            </div>
            <div style={{ display: "flex", background: "var(--muted)", borderRadius: "6px", padding: "2px", gap: "1px" }}>
              {(["year", "30d", "all"] as ProgressWindow[]).map(w => (
                <button key={w} onClick={() => setProgressWindow(w)} style={{ padding: "3px 10px", borderRadius: "4px", border: "none", cursor: "pointer", fontFamily: MONO, fontSize: "0.62rem", background: progressWindow === w ? "var(--card)" : "transparent", color: progressWindow === w ? "var(--foreground)" : "var(--muted-foreground)", fontWeight: progressWindow === w ? 500 : 400, boxShadow: progressWindow === w ? "0 1px 2px rgba(0,0,0,0.06)" : "none" }}>
                  {w === "year" ? "This Year" : w === "30d" ? "30 Days" : "All Time"}
                </button>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div style={{ display: "flex", gap: "16px", marginBottom: "14px", padding: "12px 16px", borderRadius: "8px", background: "rgba(46,170,220,0.05)", border: "1px solid rgba(46,170,220,0.15)" }}>
            <SummaryItem value={progressData.booksComplete} label="books complete" unit="/66" />
            <div style={{ width: "1px", background: "rgba(46,170,220,0.2)" }} />
            <SummaryItem value={progressData.totalRead} label="chapters read" unit={`/${progressData.totalChapters}`} />
            <div style={{ width: "1px", background: "rgba(46,170,220,0.2)" }} />
            <SummaryItem value={Math.round((progressData.totalRead / progressData.totalChapters) * 100)} label="of Bible read" unit="%" />
          </div>

          {/* Book grid */}
          <ScriptureGrid books={progressData.books} />
        </section>

        {/* ── Recent log ── */}
        <section>
          <div style={{ fontFamily: MONO, fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted-foreground)", marginBottom: "14px" }}>
            Recent Log
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "1px", borderRadius: "8px", overflow: "hidden", border: "1px solid var(--border)" }}>
            {getDays(today, 14).map((date, i) => {
              const log = logsMap.get(date);
              const isToday = date === today;
              return (
                <button key={date} onClick={() => setModal({ type: "day", date })}
                  style={{ display: "flex", alignItems: "center", padding: "10px 14px", background: i % 2 === 0 ? "var(--card)" : "var(--background)", gap: "12px", border: "none", cursor: "pointer", textAlign: "left", width: "100%" }}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--muted)"}
                  onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? "var(--card)" : "var(--background)"}
                >
                  <span style={{ fontFamily: MONO, fontSize: "0.72rem", color: isToday ? "var(--accent)" : "var(--muted-foreground)", width: "96px", flexShrink: 0 }}>
                    {isToday ? "Today" : formatDateShort(date)}
                  </span>
                  <div style={{ display: "flex", gap: "16px", flex: 1 }}>
                    <DotLabel checked={!!log?.reading} label="Reading" />
                    <DotLabel checked={!!log?.prayer}  label="Prayer"  />
                  </div>
                  {log?.readingEntries?.length ? (
                    <span style={{ fontFamily: MONO, fontSize: "0.6rem", color: "var(--accent)", background: "rgba(46,170,220,0.1)", padding: "2px 7px", borderRadius: "10px" }}>
                      {log.readingEntries.length} book{log.readingEntries.length !== 1 ? "s" : ""}
                    </span>
                  ) : null}
                  <span style={{ fontFamily: MONO, fontSize: "0.6rem", color: "var(--muted-foreground)" }}>Edit →</span>
                </button>
              );
            })}
          </div>
        </section>

      </div>

      {/* ── Modals ── */}
      {modal === "reading" && (
        <ReadingLogModal
          date={today}
          existingEntries={todayLog.readingEntries}
          onSave={entries => {
            upsertLog({ ...todayLog, readingEntries: entries, reading: true });
            setModal(null);
          }}
          onClose={() => setModal(null)}
        />
      )}

      {modal === "prayer" && (
        <PrayerQuickModal
          onClose={() => setModal(null)}
          onViewPrayerLog={onViewPrayerLog}
        />
      )}

      {modal !== null && typeof modal === "object" && modal.type === "day" && (() => {
        const dayDate = modal.date;
        const existing = logsMap.get(dayDate) ?? { date: dayDate, reading: false, prayer: false, readingEntries: [] };
        return (
          <DayLogModal
            date={dayDate}
            log={existing}
            onSave={updated => { upsertLog(updated); setModal(null); }}
            onClose={() => setModal(null)}
          />
        );
      })()}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function ToggleCard({ icon, label, checked, streak, entryCount, onToggle, onLog, logLabel }: {
  icon: React.ReactNode; label: string; checked: boolean; streak: number;
  entryCount?: number; onToggle: () => void; onLog: () => void; logLabel: string;
}) {
  return (
    <div style={{ borderRadius: "8px", border: `1px solid ${checked ? "rgba(46,170,220,0.4)" : "var(--border)"}`, background: checked ? "rgba(46,170,220,0.06)" : "var(--card)", overflow: "hidden" }}>
      <div onClick={onToggle} style={{ padding: "18px 20px 14px", cursor: "pointer", userSelect: "none" as const }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
          <span style={{ color: checked ? "var(--accent)" : "var(--muted-foreground)" }}>{icon}</span>
          {checked ? <CheckCircle2 size={18} style={{ color: "var(--accent)" }} /> : <Circle size={18} style={{ color: "var(--border)" }} />}
        </div>
        <div style={{ fontFamily: UI, fontSize: "0.9rem", fontWeight: 600, color: "var(--foreground)", marginBottom: "3px" }}>{label}</div>
        {streak > 0
          ? <div style={{ fontFamily: MONO, fontSize: "0.65rem", color: "var(--accent)" }}>{streak}d streak</div>
          : <div style={{ fontFamily: MONO, fontSize: "0.65rem", color: "var(--muted-foreground)" }}>No streak yet</div>
        }
        {entryCount != null && entryCount > 0 && (
          <div style={{ fontFamily: MONO, fontSize: "0.62rem", color: "var(--muted-foreground)", marginTop: "3px" }}>
            {entryCount} book{entryCount !== 1 ? "s" : ""} logged
          </div>
        )}
      </div>
      <div style={{ borderTop: "1px solid var(--border)" }}>
        <button onClick={e => { e.stopPropagation(); onLog(); }}
          style={{ width: "100%", padding: "9px 20px", border: "none", background: "transparent", fontFamily: UI, fontSize: "0.78rem", color: "var(--accent)", cursor: "pointer", textAlign: "left" as const, display: "flex", alignItems: "center", gap: "5px" }}
          onMouseEnter={e => e.currentTarget.style.background = "rgba(46,170,220,0.06)"}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
        >
          + {logLabel}
        </button>
      </div>
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

function SummaryItem({ value, label, unit }: { value: number; label: string; unit: string }) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{ fontFamily: MONO, fontSize: "1.3rem", fontWeight: 700, color: "var(--accent)", lineHeight: 1 }}>
        {value}<span style={{ fontSize: "0.65rem", fontWeight: 400, color: "var(--muted-foreground)" }}>{unit}</span>
      </div>
      <div style={{ fontFamily: UI, fontSize: "0.7rem", color: "var(--muted-foreground)", marginTop: "3px" }}>{label}</div>
    </div>
  );
}

function DotLabel({ checked, label }: { checked: boolean; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
      {checked
        ? <CheckCircle2 size={14} style={{ color: "var(--accent)" }} />
        : <Circle size={14} style={{ color: "var(--border)" }} />}
      <span style={{ fontFamily: UI, fontSize: "0.78rem", color: checked ? "var(--foreground)" : "var(--muted-foreground)" }}>{label}</span>
    </div>
  );
}

function SimpleMonthlyChart({ bars }: { bars: Array<{ label: string; reading: number; prayer: number }> }) {
  if (bars.length === 0) {
    return (
      <div style={{ padding: "24px", borderRadius: "8px", border: "1px solid var(--border)", textAlign: "center" }}>
        <p style={{ fontFamily: UI, fontSize: "0.875rem", color: "var(--muted-foreground)", fontStyle: "italic", margin: 0 }}>No data yet — start logging today</p>
      </div>
    );
  }
  return (
    <div style={{ padding: "20px", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--card)" }}>
      <div style={{ display: "flex", gap: "20px", marginBottom: "16px" }}>
        <LegendDot color="var(--accent)" label="Reading" />
        <LegendDot color="rgba(46,170,220,0.3)" label="Prayer" />
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: "12px", height: "80px" }}>
        {bars.map(bar => (
          <div key={bar.label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "3px", height: "100%" }}>
            <div style={{ flex: 1, width: "100%", display: "flex", alignItems: "flex-end", gap: "2px" }}>
              <div style={{ flex: 1, background: "var(--accent)", height: `${Math.max(bar.reading, 2)}%`, borderRadius: "2px 2px 0 0", opacity: 0.9 }} />
              <div style={{ flex: 1, background: "rgba(46,170,220,0.3)", height: `${Math.max(bar.prayer, 2)}%`, borderRadius: "2px 2px 0 0" }} />
            </div>
            <span style={{ fontFamily: MONO, fontSize: "0.58rem", color: "var(--muted-foreground)" }}>{bar.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
      <div style={{ width: "10px", height: "10px", borderRadius: "2px", background: color }} />
      <span style={{ fontFamily: UI, fontSize: "0.72rem", color: "var(--muted-foreground)" }}>{label}</span>
    </div>
  );
}

function ScriptureGrid({ books }: { books: Array<{ name: string; total: number; readCount: number; pct: number; complete: boolean; testament: string }> }) {
  const ot = books.filter(b => b.testament === "OT");
  const nt = books.filter(b => b.testament === "NT");

  const hasAnyData = books.some(b => b.readCount > 0);

  if (!hasAnyData) {
    return (
      <div style={{ padding: "24px", borderRadius: "8px", border: "1px dashed var(--border)", textAlign: "center" }}>
        <p style={{ fontFamily: UI, fontSize: "0.875rem", color: "var(--muted-foreground)", fontStyle: "italic", margin: "0 0 4px" }}>No reading logged yet for this period</p>
        <p style={{ fontFamily: UI, fontSize: "0.78rem", color: "var(--muted-foreground)", margin: 0 }}>Use "Log Reading" to track what you read each day</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <BookSection label="Old Testament" books={ot} />
      <BookSection label="New Testament" books={nt} />
      {/* Legend */}
      <div style={{ display: "flex", gap: "16px", justifyContent: "flex-end" }}>
        <LegendSquare color="var(--accent)" label="Complete" />
        <LegendSquare color="rgba(46,170,220,0.35)" label="In Progress" />
        <LegendSquare color="var(--muted)" label="Not Started" />
      </div>
    </div>
  );
}

function BookSection({ label, books }: { label: string; books: Array<{ name: string; total: number; readCount: number; pct: number; complete: boolean }> }) {
  const [tooltip, setTooltip] = useState<string | null>(null);

  return (
    <div>
      <div style={{ fontFamily: MONO, fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--muted-foreground)", marginBottom: "8px" }}>{label}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
        {books.map(b => {
          const bg =
            b.complete  ? "var(--accent)" :
            b.readCount > 0 ? "rgba(46,170,220,0.35)" :
            "var(--muted)";
          return (
            <div
              key={b.name}
              onMouseEnter={() => setTooltip(`${b.name}: ${b.readCount}/${b.total} chapters`)}
              onMouseLeave={() => setTooltip(null)}
              title={`${b.name}: ${b.readCount}/${b.total} chapters`}
              style={{ position: "relative", width: "28px", height: "28px", borderRadius: "4px", background: bg, cursor: "default", display: "flex", alignItems: "center", justifyContent: "center", transition: "opacity 0.1s" }}
              onMouseOver={e => e.currentTarget.style.opacity = "0.8"}
              onMouseOut={e => e.currentTarget.style.opacity = "1"}
            >
              <span style={{ fontFamily: MONO, fontSize: "0.45rem", color: b.complete ? "var(--accent-foreground)" : b.readCount > 0 ? "var(--foreground)" : "var(--muted-foreground)", fontWeight: 600, lineHeight: 1, textAlign: "center", padding: "1px" }}>
                {b.name.slice(0, 3).toUpperCase()}
              </span>
            </div>
          );
        })}
      </div>
      {tooltip && (
        <div style={{ marginTop: "6px", fontFamily: MONO, fontSize: "0.65rem", color: "var(--muted-foreground)" }}>{tooltip}</div>
      )}
    </div>
  );
}

function LegendSquare({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
      <div style={{ width: "10px", height: "10px", borderRadius: "2px", background: color }} />
      <span style={{ fontFamily: UI, fontSize: "0.7rem", color: "var(--muted-foreground)" }}>{label}</span>
    </div>
  );
}

// ── Data helpers ───────────────────────────────────────────────────────────────

function getDays(from: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(from + "T12:00:00");
    d.setDate(d.getDate() - i);
    return d.toISOString().slice(0, 10);
  });
}

function calcStreak(logsMap: Map<string, DayLog>, today: string, field: "reading" | "prayer"): number {
  let streak = 0;
  const d = new Date(today + "T12:00:00");
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
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const year = d.getFullYear(), month = d.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;
    const ml = logs.filter(l => l.date.startsWith(prefix));
    return {
      label:   d.toLocaleString("en-US", { month: "short" }),
      reading: Math.round((ml.filter(l => l.reading).length / daysInMonth) * 100),
      prayer:  Math.round((ml.filter(l => l.prayer).length  / daysInMonth) * 100),
    };
  });
}

function formatDate(iso: string): string {
  return new Date(iso + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

function formatDateShort(iso: string): string {
  return new Date(iso + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}
