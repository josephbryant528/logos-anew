'use client'

import { useState, useEffect, useRef } from "react";
import { Plus, CheckCircle2, Circle, ChevronDown, ChevronUp, Trash2, Sparkles, MessageSquare, X } from "lucide-react";
import { PrayerItem, PrayerNote, loadPrayers, savePrayers, uid } from "../data/prayer";

const UI   = "'Inter', system-ui, sans-serif";
const BODY = "'Lora', serif";
const MONO = "'DM Mono', monospace";

type Filter = "active" | "answered" | "all";

export function PrayerLog() {
  const [items, setItems]       = useState<PrayerItem[]>(loadPrayers);
  const [filter, setFilter]     = useState<Filter>("active");
  const [showForm, setShowForm] = useState(false);

  useEffect(() => { savePrayers(items); }, [items]);

  const addItem = (title: string, description: string) => {
    const item: PrayerItem = {
      id: uid(), title, description,
      createdAt: new Date().toISOString(),
      answered: false, notes: [],
    };
    setItems(prev => [item, ...prev]);
    setShowForm(false);
  };

  const updateItem = (updated: PrayerItem) => {
    setItems(prev => prev.map(p => p.id === updated.id ? updated : p));
  };

  const deleteItem = (id: string) => {
    setItems(prev => prev.filter(p => p.id !== id));
  };

  const filtered = items.filter(p =>
    filter === "all"      ? true :
    filter === "answered" ? p.answered :
    !p.answered
  );

  const activeCount   = items.filter(p => !p.answered).length;
  const answeredCount = items.filter(p =>  p.answered).length;

  return (
    <div style={{ fontFamily: UI }}>
      {/* Tinted header band */}
      <div style={{ background: "rgba(46,170,220,0.05)", borderBottom: "1px solid rgba(46,170,220,0.1)", padding: "48px 96px 36px" }}>
        <div style={{ maxWidth: "528px" }}>
          <div style={{ fontFamily: MONO, fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--accent)", marginBottom: "10px" }}>
            Spiritual Formation
          </div>
          <h1 style={{ fontSize: "2rem", fontWeight: 700, color: "var(--foreground)", marginBottom: "6px", lineHeight: 1.2 }}>
            Prayer Log
          </h1>
          <p style={{ fontSize: "0.875rem", color: "var(--muted-foreground)", margin: 0 }}>
            Record requests, leave notes over time, and mark answered prayers
          </p>
        </div>
      </div>

      <div style={{ maxWidth: "720px", margin: "0 auto", padding: "40px 96px 120px" }}>

        {/* Controls row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px", gap: "12px" }}>
          <div style={{ display: "flex", background: "var(--muted)", borderRadius: "6px", padding: "2px", gap: "1px" }}>
            {(["active", "answered", "all"] as Filter[]).map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{ padding: "4px 12px", borderRadius: "4px", border: "none", cursor: "pointer", fontFamily: UI, fontSize: "0.78rem", background: filter === f ? "var(--card)" : "transparent", color: filter === f ? "var(--foreground)" : "var(--muted-foreground)", fontWeight: filter === f ? 500 : 400, boxShadow: filter === f ? "0 1px 2px rgba(0,0,0,0.06)" : "none" }}>
                {f === "active" ? `Active (${activeCount})` : f === "answered" ? `Answered (${answeredCount})` : "All"}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowForm(true)}
            style={{ display: "flex", alignItems: "center", gap: "6px", padding: "7px 14px", borderRadius: "6px", border: "none", background: "var(--foreground)", color: "var(--card)", fontFamily: UI, fontSize: "0.82rem", fontWeight: 500, cursor: "pointer" }}
          >
            <Plus size={14} /> New Prayer
          </button>
        </div>

        {showForm && (
          <NewPrayerForm onAdd={addItem} onCancel={() => setShowForm(false)} />
        )}

        {filtered.length === 0 ? (
          <div style={{ padding: "32px 24px", borderRadius: "8px", border: "1px solid var(--border)", textAlign: "center" }}>
            <p style={{ fontFamily: UI, fontSize: "0.875rem", color: "var(--muted-foreground)", fontStyle: "italic", margin: 0 }}>
              {filter === "answered" ? "No answered prayers recorded yet." : filter === "active" ? "No active prayers. Add one above." : "No prayers recorded yet."}
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {filtered.map(item => (
              <PrayerCard key={item.id} item={item} onUpdate={updateItem} onDelete={() => deleteItem(item.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── New prayer form ────────────────────────────────────────────────────────────

function NewPrayerForm({ onAdd, onCancel }: { onAdd: (title: string, desc: string) => void; onCancel: () => void }) {
  const [title, setTitle] = useState("");
  const [desc,  setDesc]  = useState("");
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => { titleRef.current?.focus(); }, []);

  const canSubmit = title.trim().length > 0;

  return (
    <div style={{ marginBottom: "16px", padding: "16px", borderRadius: "8px", border: "1px solid var(--accent)", background: "rgba(46,170,220,0.04)" }}>
      <div style={{ fontFamily: UI, fontSize: "0.72rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--accent)", marginBottom: "12px" }}>
        New Prayer Request
      </div>
      <input
        ref={titleRef}
        value={title}
        onChange={e => setTitle(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter" && canSubmit) onAdd(title.trim(), desc.trim()); if (e.key === "Escape") onCancel(); }}
        placeholder="What are you praying for?"
        style={{ ...inputStyle, marginBottom: "8px" }}
      />
      <textarea
        value={desc}
        onChange={e => setDesc(e.target.value)}
        placeholder="Context, details, or initial notes… (optional)"
        rows={3}
        style={{ ...inputStyle, resize: "vertical", minHeight: "68px", lineHeight: 1.6, fontFamily: BODY, fontSize: "0.875rem", marginBottom: "12px", boxSizing: "border-box" } as React.CSSProperties}
      />
      <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
        <button onClick={onCancel} style={{ padding: "6px 14px", borderRadius: "6px", border: "1px solid var(--border)", background: "transparent", fontFamily: UI, fontSize: "0.82rem", color: "var(--muted-foreground)", cursor: "pointer" }}>
          Cancel
        </button>
        <button onClick={() => canSubmit && onAdd(title.trim(), desc.trim())} disabled={!canSubmit}
          style={{ padding: "6px 14px", borderRadius: "6px", border: "none", background: canSubmit ? "var(--foreground)" : "var(--muted)", color: canSubmit ? "var(--card)" : "var(--muted-foreground)", fontFamily: UI, fontSize: "0.82rem", fontWeight: 500, cursor: canSubmit ? "pointer" : "default" }}>
          Add Prayer
        </button>
      </div>
    </div>
  );
}

// ── Prayer card ────────────────────────────────────────────────────────────────

function PrayerCard({ item, onUpdate, onDelete }: { item: PrayerItem; onUpdate: (p: PrayerItem) => void; onDelete: () => void }) {
  const [expanded,      setExpanded]      = useState(false);
  const [addingNote,    setAddingNote]    = useState(false);
  const [noteText,      setNoteText]      = useState("");
  const [markingAnswer, setMarkingAnswer] = useState(false);
  const [answerText,    setAnswerText]    = useState(item.answeredNote ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const noteRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { if (addingNote) noteRef.current?.focus(); }, [addingNote]);

  const addNote = () => {
    if (!noteText.trim()) return;
    const note: PrayerNote = { id: uid(), text: noteText.trim(), createdAt: new Date().toISOString() };
    onUpdate({ ...item, notes: [...item.notes, note] });
    setNoteText("");
    setAddingNote(false);
  };

  const deleteNote = (id: string) => {
    onUpdate({ ...item, notes: item.notes.filter(n => n.id !== id) });
  };

  const markAnswered = () => {
    onUpdate({ ...item, answered: true, answeredAt: new Date().toISOString(), answeredNote: answerText.trim() || undefined });
    setMarkingAnswer(false);
  };

  const unmarkAnswered = () => {
    onUpdate({ ...item, answered: false, answeredAt: undefined, answeredNote: undefined });
  };

  const age = formatAge(item.createdAt);

  return (
    <div style={{ borderRadius: "8px", border: `1px solid ${item.answered ? "rgba(46,170,220,0.35)" : "var(--border)"}`, background: item.answered ? "rgba(46,170,220,0.04)" : "var(--card)", overflow: "hidden", transition: "border-color 0.2s" }}>
      {/* Card header */}
      <div style={{ padding: "14px 16px", display: "flex", alignItems: "flex-start", gap: "12px" }}>
        <button
          onClick={() => item.answered ? unmarkAnswered() : setMarkingAnswer(m => !m)}
          title={item.answered ? "Mark unanswered" : "Mark as answered"}
          style={{ marginTop: "1px", padding: "2px", border: "none", background: "transparent", cursor: "pointer", flexShrink: 0, color: item.answered ? "var(--accent)" : "var(--muted-foreground)" }}
        >
          {item.answered ? <CheckCircle2 size={18} strokeWidth={2} /> : <Circle size={18} strokeWidth={1.5} />}
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
            <span style={{ fontFamily: UI, fontSize: "0.9rem", fontWeight: 600, color: item.answered ? "var(--accent)" : "var(--foreground)", flex: 1 }}>
              {item.title}
            </span>
            {item.answered && (
              <span style={{ fontFamily: MONO, fontSize: "0.6rem", padding: "2px 7px", borderRadius: "10px", background: "rgba(46,170,220,0.15)", color: "var(--accent)", border: "1px solid rgba(46,170,220,0.3)", flexShrink: 0 }}>
                Answered
              </span>
            )}
          </div>
          <div style={{ display: "flex", gap: "10px", marginTop: "3px", alignItems: "center" }}>
            <span style={{ fontFamily: MONO, fontSize: "0.62rem", color: "var(--muted-foreground)" }}>{age}</span>
            {item.notes.length > 0 && (
              <span style={{ fontFamily: MONO, fontSize: "0.62rem", color: "var(--muted-foreground)" }}>{item.notes.length} {item.notes.length === 1 ? "note" : "notes"}</span>
            )}
            {item.answeredAt && (
              <span style={{ fontFamily: MONO, fontSize: "0.62rem", color: "var(--accent)" }}>
                Answered {formatAge(item.answeredAt)}
              </span>
            )}
          </div>
        </div>

        <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
          <button onClick={() => setExpanded(e => !e)} style={ghostBtn} title={expanded ? "Collapse" : "Expand"}>
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {confirmDelete ? (
            <>
              <button onClick={onDelete} style={{ ...ghostBtn, color: "var(--destructive)" }}><Trash2 size={13} /></button>
              <button onClick={() => setConfirmDelete(false)} style={ghostBtn}><X size={13} /></button>
            </>
          ) : (
            <button onClick={() => setConfirmDelete(true)} style={ghostBtn} title="Delete"><Trash2 size={13} /></button>
          )}
        </div>
      </div>

      {/* Expanded body */}
      {expanded && (
        <div style={{ borderTop: "1px solid var(--border)", padding: "14px 16px 16px" }}>
          {item.description && (
            <p style={{ fontFamily: BODY, fontSize: "0.875rem", lineHeight: 1.7, color: "var(--foreground)", margin: "0 0 14px", fontStyle: "italic" }}>
              {item.description}
            </p>
          )}

          {item.answered && item.answeredNote && (
            <div style={{ marginBottom: "14px", padding: "12px 14px", borderRadius: "6px", background: "rgba(46,170,220,0.07)", border: "1px solid rgba(46,170,220,0.25)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
                <Sparkles size={12} style={{ color: "var(--accent)" }} />
                <span style={{ fontFamily: MONO, fontSize: "0.62rem", textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--accent)" }}>How it was answered</span>
              </div>
              <p style={{ fontFamily: BODY, fontSize: "0.875rem", lineHeight: 1.65, color: "var(--foreground)", margin: 0 }}>
                {item.answeredNote}
              </p>
            </div>
          )}

          {item.notes.length > 0 && (
            <div style={{ marginBottom: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ fontFamily: MONO, fontSize: "0.62rem", textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--muted-foreground)", marginBottom: "2px" }}>Notes</div>
              {item.notes.map(note => (
                <div key={note.id} style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                  <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: "var(--accent)", flexShrink: 0, marginTop: "7px" }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontFamily: BODY, fontSize: "0.875rem", lineHeight: 1.65, color: "var(--foreground)", margin: "0 0 2px" }}>{note.text}</p>
                    <span style={{ fontFamily: MONO, fontSize: "0.6rem", color: "var(--muted-foreground)" }}>{formatAbsolute(note.createdAt)}</span>
                  </div>
                  <button onClick={() => deleteNote(note.id)} style={{ ...ghostBtn, marginTop: "1px" }}><Trash2 size={11} /></button>
                </div>
              ))}
            </div>
          )}

          {addingNote ? (
            <div style={{ marginTop: "8px" }}>
              <textarea
                ref={noteRef}
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                onKeyDown={e => { if (e.key === "Escape") { setAddingNote(false); setNoteText(""); } }}
                placeholder="Add a note or update…"
                rows={2}
                style={{ ...inputStyle, resize: "vertical", minHeight: "60px", lineHeight: 1.6, fontFamily: BODY, fontSize: "0.875rem", marginBottom: "8px", boxSizing: "border-box" } as React.CSSProperties}
              />
              <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                <button onClick={() => { setAddingNote(false); setNoteText(""); }} style={{ padding: "5px 12px", borderRadius: "5px", border: "1px solid var(--border)", background: "transparent", fontFamily: UI, fontSize: "0.78rem", color: "var(--muted-foreground)", cursor: "pointer" }}>Cancel</button>
                <button onClick={addNote} disabled={!noteText.trim()} style={{ padding: "5px 12px", borderRadius: "5px", border: "none", background: noteText.trim() ? "var(--foreground)" : "var(--muted)", color: noteText.trim() ? "var(--card)" : "var(--muted-foreground)", fontFamily: UI, fontSize: "0.78rem", fontWeight: 500, cursor: noteText.trim() ? "pointer" : "default" }}>Save Note</button>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <button onClick={() => setAddingNote(true)} style={{ display: "flex", alignItems: "center", gap: "5px", padding: "5px 12px", borderRadius: "5px", border: "1px solid var(--border)", background: "transparent", fontFamily: UI, fontSize: "0.78rem", color: "var(--muted-foreground)", cursor: "pointer" }}
                onMouseEnter={e => { e.currentTarget.style.background = "var(--muted)"; e.currentTarget.style.color = "var(--foreground)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--muted-foreground)"; }}
              >
                <MessageSquare size={12} /> Add Note
              </button>
              {!item.answered && (
                <button onClick={() => setMarkingAnswer(m => !m)} style={{ display: "flex", alignItems: "center", gap: "5px", padding: "5px 12px", borderRadius: "5px", border: "1px solid rgba(46,170,220,0.35)", background: "transparent", fontFamily: UI, fontSize: "0.78rem", color: "var(--accent)", cursor: "pointer" }}
                  onMouseEnter={e => { e.currentTarget.style.background = "rgba(46,170,220,0.07)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                >
                  <Sparkles size={12} /> Mark Answered
                </button>
              )}
            </div>
          )}

          {markingAnswer && !item.answered && (
            <div style={{ marginTop: "12px", padding: "12px 14px", borderRadius: "6px", border: "1px solid rgba(46,170,220,0.3)", background: "rgba(46,170,220,0.04)" }}>
              <div style={{ fontFamily: MONO, fontSize: "0.62rem", textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--accent)", marginBottom: "8px" }}>
                How was this prayer answered?
              </div>
              <textarea
                value={answerText}
                onChange={e => setAnswerText(e.target.value)}
                placeholder="Describe how God answered this prayer… (optional)"
                rows={3}
                style={{ ...inputStyle, resize: "vertical", minHeight: "68px", lineHeight: 1.6, fontFamily: BODY, fontSize: "0.875rem", marginBottom: "10px", boxSizing: "border-box" } as React.CSSProperties}
              />
              <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                <button onClick={() => setMarkingAnswer(false)} style={{ padding: "5px 12px", borderRadius: "5px", border: "1px solid var(--border)", background: "transparent", fontFamily: UI, fontSize: "0.78rem", color: "var(--muted-foreground)", cursor: "pointer" }}>Cancel</button>
                <button onClick={markAnswered} style={{ padding: "5px 12px", borderRadius: "5px", border: "none", background: "var(--accent)", color: "var(--accent-foreground)", fontFamily: UI, fontSize: "0.78rem", fontWeight: 600, cursor: "pointer" }}>Confirm Answered</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function formatAge(iso: string): string {
  const ms   = Date.now() - new Date(iso).getTime();
  const days = Math.floor(ms / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7)  return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

function formatAbsolute(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const inputStyle: React.CSSProperties = {
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

const ghostBtn: React.CSSProperties = {
  padding: "4px", borderRadius: "4px", border: "none",
  background: "transparent", cursor: "pointer",
  color: "var(--muted-foreground)", display: "flex", alignItems: "center",
};
