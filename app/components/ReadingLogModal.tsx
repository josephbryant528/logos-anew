'use client'

import { useState, useRef, useEffect } from "react";
import { X, Plus, Trash2, ChevronDown } from "lucide-react";
import { BIBLE_BOOKS } from "../data/scripture";
import { ReadingEntry, uid } from "../data/disciplines";

const UI   = "'Inter', system-ui, sans-serif";
const BODY = "'Lora', serif";
const MONO = "'DM Mono', monospace";

interface Props {
  date: string;           // "YYYY-MM-DD"
  existingEntries?: ReadingEntry[];
  onSave: (entries: ReadingEntry[]) => void;
  onClose: () => void;
}

interface DraftEntry {
  id: string;
  book: string;
  chapters: number[];
  notes: string;
}

function emptyDraft(): DraftEntry {
  return { id: uid(), book: "", chapters: [], notes: "" };
}

export function ReadingLogModal({ date, existingEntries = [], onSave, onClose }: Props) {
  const [drafts, setDrafts] = useState<DraftEntry[]>(() =>
    existingEntries.length > 0
      ? existingEntries.map(e => ({ id: e.id, book: e.book, chapters: [...e.chapters], notes: e.notes ?? "" }))
      : [emptyDraft()]
  );

  const updateDraft = (id: string, patch: Partial<DraftEntry>) =>
    setDrafts(prev => prev.map(d => d.id === id ? { ...d, ...patch } : d));

  const removeDraft = (id: string) =>
    setDrafts(prev => prev.filter(d => d.id !== id));

  const addDraft = () => setDrafts(prev => [...prev, emptyDraft()]);

  const handleSave = () => {
    const valid = drafts.filter(d => d.book && d.chapters.length > 0);
    if (valid.length === 0) { onClose(); return; }
    onSave(valid.map(d => ({ id: d.id, book: d.book, chapters: [...d.chapters].sort((a,b)=>a-b), notes: d.notes.trim() || undefined })));
  };

  const displayDate = new Date(date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <Modal onClose={onClose}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
        <div>
          <div style={{ fontFamily: MONO, fontSize: "0.62rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--accent)", marginBottom: "4px" }}>Log Reading</div>
          <h2 style={{ fontFamily: UI, fontSize: "1.1rem", fontWeight: 700, color: "var(--foreground)", margin: 0 }}>{displayDate}</h2>
        </div>
        <button onClick={onClose} style={closeBtn}><X size={16} /></button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "16px", maxHeight: "55vh", overflowY: "auto", paddingRight: "4px" }}>
        {drafts.map((draft, idx) => (
          <BookEntry
            key={draft.id}
            draft={draft}
            index={idx}
            showRemove={drafts.length > 1}
            onChange={patch => updateDraft(draft.id, patch)}
            onRemove={() => removeDraft(draft.id)}
          />
        ))}
      </div>

      <button onClick={addDraft} style={{ marginTop: "12px", display: "flex", alignItems: "center", gap: "6px", padding: "7px 14px", borderRadius: "6px", border: "1px dashed var(--border)", background: "transparent", fontFamily: UI, fontSize: "0.82rem", color: "var(--muted-foreground)", cursor: "pointer", width: "100%" }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.color = "var(--accent)"; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--muted-foreground)"; }}
      >
        <Plus size={14} /> Add another book
      </button>

      <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "20px" }}>
        <button onClick={onClose} style={secondaryBtn}>Cancel</button>
        <button onClick={handleSave} style={primaryBtn}>Save Reading Log</button>
      </div>
    </Modal>
  );
}

// ── Single book entry ─────────────────────────────────────────────────────────

function BookEntry({ draft, index, showRemove, onChange, onRemove }: {
  draft: DraftEntry; index: number; showRemove: boolean;
  onChange: (patch: Partial<DraftEntry>) => void; onRemove: () => void;
}) {
  const [bookSearch, setBookSearch] = useState(draft.book);
  const [showDropdown, setShowDropdown] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const bookMeta = BIBLE_BOOKS.find(b => b.name === draft.book);
  const chapterCount = bookMeta?.chapters ?? 0;
  const allChapters = Array.from({ length: chapterCount }, (_, i) => i + 1);

  const filteredBooks = BIBLE_BOOKS.filter(b =>
    b.name.toLowerCase().includes(bookSearch.toLowerCase())
  );

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setShowDropdown(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const toggleChapter = (ch: number) => {
    const next = draft.chapters.includes(ch)
      ? draft.chapters.filter(c => c !== ch)
      : [...draft.chapters, ch];
    onChange({ chapters: next });
  };

  const selectAll = () => onChange({ chapters: allChapters });
  const clearAll  = () => onChange({ chapters: [] });

  return (
    <div style={{ padding: "14px", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--card)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
        <span style={{ fontFamily: MONO, fontSize: "0.62rem", textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--muted-foreground)" }}>
          Book {index + 1}
        </span>
        {showRemove && (
          <button onClick={onRemove} style={{ padding: "2px", border: "none", background: "transparent", cursor: "pointer", color: "var(--muted-foreground)" }}><Trash2 size={13} /></button>
        )}
      </div>

      {/* Book picker */}
      <div ref={wrapRef} style={{ position: "relative", marginBottom: "12px" }}>
        <div style={{ position: "relative" }}>
          <input
            value={bookSearch}
            onChange={e => { setBookSearch(e.target.value); setShowDropdown(true); onChange({ book: "", chapters: [] }); }}
            onFocus={() => setShowDropdown(true)}
            placeholder="Search book…"
            style={{ ...inputStyle, paddingRight: "28px" }}
          />
          <ChevronDown size={13} style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)", pointerEvents: "none" }} />
        </div>
        {showDropdown && filteredBooks.length > 0 && (
          <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "var(--card)", border: "1px solid var(--border)", borderRadius: "6px", maxHeight: "180px", overflowY: "auto", zIndex: 100, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
            {filteredBooks.map(b => (
              <button key={b.name} onMouseDown={e => { e.preventDefault(); onChange({ book: b.name, chapters: [] }); setBookSearch(b.name); setShowDropdown(false); }}
                style={{ width: "100%", textAlign: "left", padding: "7px 10px", border: "none", background: "transparent", fontFamily: UI, fontSize: "0.85rem", color: "var(--foreground)", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                onMouseEnter={e => e.currentTarget.style.background = "var(--muted)"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                <span>{b.name}</span>
                <span style={{ fontFamily: MONO, fontSize: "0.6rem", color: "var(--muted-foreground)" }}>
                  {b.testament === "OT" ? "OT" : "NT"} · {b.chapters} ch
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Chapter multi-select */}
      {draft.book && chapterCount > 0 && (
        <div style={{ marginBottom: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
            <span style={{ fontFamily: MONO, fontSize: "0.62rem", textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--muted-foreground)" }}>
              Chapters · {draft.chapters.length}/{chapterCount} selected
            </span>
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={selectAll} style={tinyBtn}>All</button>
              <button onClick={clearAll}  style={tinyBtn}>Clear</button>
            </div>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
            {allChapters.map(ch => {
              const sel = draft.chapters.includes(ch);
              return (
                <button key={ch} onClick={() => toggleChapter(ch)} style={{ padding: "3px 7px", borderRadius: "4px", border: `1px solid ${sel ? "var(--accent)" : "var(--border)"}`, background: sel ? "var(--accent)" : "transparent", color: sel ? "var(--accent-foreground)" : "var(--muted-foreground)", fontFamily: MONO, fontSize: "0.7rem", cursor: "pointer", lineHeight: 1.4, transition: "all 0.1s" }}>
                  {ch}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Notes */}
      <textarea
        value={draft.notes}
        onChange={e => onChange({ notes: e.target.value })}
        placeholder="Notes or reflections for this reading… (optional)"
        rows={2}
        style={{ ...inputStyle, resize: "vertical", minHeight: "54px", fontFamily: BODY, fontSize: "0.85rem", lineHeight: 1.6, boxSizing: "border-box" } as React.CSSProperties}
      />
    </div>
  );
}

// ── Modal shell ───────────────────────────────────────────────────────────────

export function Modal({ children, onClose, width = "520px" }: { children: React.ReactNode; onClose: () => void; width?: string }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ width: "100%", maxWidth: width, background: "var(--card)", borderRadius: "12px", padding: "24px", boxShadow: "0 20px 60px rgba(0,0,0,0.25)", border: "1px solid var(--border)" }}>
        {children}
      </div>
    </div>
  );
}

// ── Shared styles ─────────────────────────────────────────────────────────────

export const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: "6px",
  border: "1px solid var(--border)",
  background: "var(--background)",
  fontFamily: "'Inter', system-ui, sans-serif",
  fontSize: "0.875rem",
  color: "var(--foreground)",
  outline: "none",
};

export const primaryBtn: React.CSSProperties = {
  padding: "8px 18px", borderRadius: "6px", border: "none",
  background: "var(--foreground)", color: "var(--card)",
  fontFamily: "'Inter', system-ui, sans-serif", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer",
};

export const secondaryBtn: React.CSSProperties = {
  padding: "8px 18px", borderRadius: "6px",
  border: "1px solid var(--border)", background: "transparent",
  fontFamily: "'Inter', system-ui, sans-serif", fontSize: "0.85rem",
  color: "var(--muted-foreground)", cursor: "pointer",
};

const closeBtn: React.CSSProperties = {
  padding: "4px", borderRadius: "4px", border: "none",
  background: "transparent", cursor: "pointer", color: "var(--muted-foreground)",
  display: "flex", alignItems: "center",
};

const tinyBtn: React.CSSProperties = {
  padding: "2px 8px", borderRadius: "4px", border: "1px solid var(--border)",
  background: "transparent", fontFamily: "'DM Mono', monospace", fontSize: "0.62rem",
  color: "var(--muted-foreground)", cursor: "pointer",
};
