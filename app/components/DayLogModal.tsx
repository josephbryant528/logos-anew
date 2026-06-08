'use client'

import { useState } from "react";
import { X, BookOpen, MessageCircle, Plus, Trash2 } from "lucide-react";
import { DayLog, ReadingEntry, uid } from "../data/disciplines";
import { ReadingLogModal, Modal, primaryBtn, secondaryBtn } from "./ReadingLogModal";

const UI   = "'Inter', system-ui, sans-serif";
const BODY = "'Lora', serif";
const MONO = "'DM Mono', monospace";

interface Props {
  date: string;
  log: DayLog;
  onSave: (updated: DayLog) => void;
  onClose: () => void;
}

export function DayLogModal({ date, log, onSave, onClose }: Props) {
  const [draft, setDraft] = useState<DayLog>({ ...log, readingEntries: [...log.readingEntries] });
  const [showReadingLog, setShowReadingLog] = useState(false);

  const displayDate = new Date(date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  const toggle = (field: "reading" | "prayer") =>
    setDraft(d => ({ ...d, [field]: !d[field] }));

  const removeEntry = (id: string) =>
    setDraft(d => ({ ...d, readingEntries: d.readingEntries.filter(e => e.id !== id) }));

  const handleEntriesSaved = (entries: ReadingEntry[]) => {
    setDraft(d => ({ ...d, readingEntries: entries, reading: entries.length > 0 ? true : d.reading }));
    setShowReadingLog(false);
  };

  const handleSave = () => {
    onSave(draft);
  };

  if (showReadingLog) {
    return (
      <ReadingLogModal
        date={date}
        existingEntries={draft.readingEntries}
        onSave={handleEntriesSaved}
        onClose={() => setShowReadingLog(false)}
      />
    );
  }

  return (
    <Modal onClose={onClose} width="480px">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
        <div>
          <div style={{ fontFamily: MONO, fontSize: "0.62rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--accent)", marginBottom: "4px" }}>Edit Day</div>
          <h2 style={{ fontFamily: UI, fontSize: "1.1rem", fontWeight: 700, color: "var(--foreground)", margin: 0 }}>{displayDate}</h2>
        </div>
        <button onClick={onClose} style={{ padding: "4px", borderRadius: "4px", border: "none", background: "transparent", cursor: "pointer", color: "var(--muted-foreground)", display: "flex" }}><X size={16} /></button>
      </div>

      {/* Toggles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "20px" }}>
        <ToggleRow
          icon={<BookOpen size={15} />}
          label="Bible Reading"
          checked={draft.reading}
          onToggle={() => toggle("reading")}
        />
        <ToggleRow
          icon={<MessageCircle size={15} />}
          label="Prayer"
          checked={draft.prayer}
          onToggle={() => toggle("prayer")}
        />
      </div>

      {/* Reading entries */}
      <div style={{ marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
          <span style={{ fontFamily: MONO, fontSize: "0.62rem", textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--muted-foreground)" }}>
            Reading Log {draft.readingEntries.length > 0 ? `· ${draft.readingEntries.length} book${draft.readingEntries.length !== 1 ? "s" : ""}` : ""}
          </span>
          <button
            onClick={() => setShowReadingLog(true)}
            style={{ display: "flex", alignItems: "center", gap: "5px", padding: "4px 10px", borderRadius: "5px", border: "1px solid var(--border)", background: "transparent", fontFamily: UI, fontSize: "0.75rem", color: "var(--muted-foreground)", cursor: "pointer" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.color = "var(--accent)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--muted-foreground)"; }}
          >
            <Plus size={12} /> {draft.readingEntries.length > 0 ? "Edit" : "Add Reading"}
          </button>
        </div>

        {draft.readingEntries.length === 0 ? (
          <div style={{ padding: "14px", borderRadius: "6px", border: "1px dashed var(--border)", textAlign: "center" }}>
            <p style={{ fontFamily: UI, fontSize: "0.8rem", color: "var(--muted-foreground)", fontStyle: "italic", margin: 0 }}>No reading logged for this day</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {draft.readingEntries.map(entry => (
              <EntryRow key={entry.id} entry={entry} onRemove={() => removeEntry(entry.id)} />
            ))}
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
        <button onClick={onClose} style={secondaryBtn}>Cancel</button>
        <button onClick={handleSave} style={primaryBtn}>Save</button>
      </div>
    </Modal>
  );
}

function ToggleRow({ icon, label, checked, onToggle }: { icon: React.ReactNode; label: string; checked: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px 14px", borderRadius: "8px", border: `1px solid ${checked ? "rgba(46,170,220,0.4)" : "var(--border)"}`, background: checked ? "rgba(46,170,220,0.06)" : "var(--card)", cursor: "pointer", userSelect: "none" as const }}>
      <span style={{ color: checked ? "var(--accent)" : "var(--muted-foreground)" }}>{icon}</span>
      <span style={{ fontFamily: UI, fontSize: "0.85rem", fontWeight: 500, color: "var(--foreground)", flex: 1, textAlign: "left" }}>{label}</span>
      <div style={{ width: "16px", height: "16px", borderRadius: "50%", border: `2px solid ${checked ? "var(--accent)" : "var(--border)"}`, background: checked ? "var(--accent)" : "transparent", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {checked && <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--accent-foreground)" }} />}
      </div>
    </button>
  );
}

function EntryRow({ entry, onRemove }: { entry: ReadingEntry; onRemove: () => void }) {
  const sortedChapters = [...entry.chapters].sort((a, b) => a - b);
  const chapterLabel = formatChapterList(sortedChapters);

  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", padding: "10px 12px", borderRadius: "6px", border: "1px solid var(--border)", background: "var(--card)" }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
          <span style={{ fontFamily: UI, fontSize: "0.875rem", fontWeight: 600, color: "var(--foreground)" }}>{entry.book}</span>
          <span style={{ fontFamily: MONO, fontSize: "0.65rem", color: "var(--accent)" }}>{chapterLabel}</span>
        </div>
        {entry.notes && (
          <p style={{ fontFamily: BODY, fontSize: "0.78rem", color: "var(--muted-foreground)", margin: "3px 0 0", lineHeight: 1.5, fontStyle: "italic" }}>{entry.notes}</p>
        )}
      </div>
      <button onClick={onRemove} style={{ padding: "2px", border: "none", background: "transparent", cursor: "pointer", color: "var(--muted-foreground)", flexShrink: 0 }}><Trash2 size={12} /></button>
    </div>
  );
}

/** Compact chapter list: [1,2,3,5,6] → "Ch. 1–3, 5–6" */
function formatChapterList(chapters: number[]): string {
  if (chapters.length === 0) return "";
  const ranges: string[] = [];
  let start = chapters[0], end = chapters[0];
  for (let i = 1; i < chapters.length; i++) {
    if (chapters[i] === end + 1) { end = chapters[i]; }
    else {
      ranges.push(start === end ? `${start}` : `${start}–${end}`);
      start = end = chapters[i];
    }
  }
  ranges.push(start === end ? `${start}` : `${start}–${end}`);
  return "Ch. " + ranges.join(", ");
}
