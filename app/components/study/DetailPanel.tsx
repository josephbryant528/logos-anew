'use client'

import { useRef } from "react";
import { type OriginalWord, type ScriptureVerse, type Commentary } from "../../data/scripture";
import { X, FileText, MessageSquare, Sparkles, Maximize2, Minimize2 } from "lucide-react";
import { AIStudyTab } from "./AIStudyTab";
import { CommentaryTab } from "./CommentaryTab";
import { LexiconTab } from "./LexiconTab";
import { UI, TAP, canHover, iconBtn } from "../../ui/tokens";

export interface SheetControls { full: boolean; onExpand: () => void; onShrink: () => void; onDismiss: () => void }

// Grab handle on the phone's bottom sheet: tap to expand or shrink, swipe up
// to expand, swipe down to shrink and then close.
export function SheetHandle({ sheet }: { sheet: SheetControls }) {
  const startY = useRef<number | null>(null);
  const swiped = useRef(false);
  return (
    <div
      aria-hidden="true"
      onPointerDown={e => { startY.current = e.clientY; swiped.current = false; e.currentTarget.setPointerCapture(e.pointerId); }}
      onPointerUp={e => {
        if (startY.current === null) return;
        const dy = e.clientY - startY.current;
        startY.current = null;
        if (dy > 40) { swiped.current = true; if (sheet.full) sheet.onShrink(); else sheet.onDismiss(); }
        else if (dy < -40) { swiped.current = true; sheet.onExpand(); }
      }}
      onPointerCancel={() => { startY.current = null; }}
      onClick={() => { if (swiped.current) { swiped.current = false; return; } if (sheet.full) sheet.onShrink(); else sheet.onExpand(); }}
      style={{ display: "flex", justifyContent: "center", alignItems: "center", width: "100%", height: "32px", cursor: "grab", touchAction: "none", flexShrink: 0 }}
    >
      <span style={{ width: "40px", height: "5px", borderRadius: "3px", background: "var(--muted-foreground)", opacity: 0.45 }} />
    </div>
  );
}

export function DetailPanel({ verse, commentaries, selectedWord, tab, onTabChange, onWordSelect, onClose, sheet, onNavigateTo, onCrossRefNavigate }: {
  verse: ScriptureVerse; commentaries: Commentary[]; selectedWord: OriginalWord | null; sheet?: SheetControls;
  tab: "lexicon" | "commentary" | "ai"; onTabChange: (t: "lexicon" | "commentary" | "ai") => void;
  onWordSelect: (w: OriginalWord) => void; onClose: () => void;
  onNavigateTo: (book: string, chapter: number, verse: number | null, pushHistory?: boolean) => void;
  onCrossRefNavigate: (book: string, chapter: number, verse: number) => void;
}) {
  const verseKey = `${verse.book} ${verse.chapter}:${verse.verse}`;
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      {sheet && <SheetHandle sheet={sheet} />}
      <div style={{ padding: sheet ? "0 16px" : "14px 16px 0", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
          <span style={{ fontFamily: UI, fontSize: "0.8rem", color: "var(--muted-foreground)" }}>{verseKey}</span>
          <div style={{ display: "flex", alignItems: "center", margin: "-12px -12px -12px 0" }}>
          {sheet && (
            <button onClick={sheet.full ? sheet.onShrink : sheet.onExpand} aria-label={sheet.full ? "Shrink study panel" : "Expand study panel"} aria-expanded={sheet.full} style={iconBtn}>
              {sheet.full ? <Minimize2 size={17} style={{ color: "var(--muted-foreground)" }} /> : <Maximize2 size={17} style={{ color: "var(--muted-foreground)" }} />}
            </button>
          )}
          <button onClick={onClose} aria-label="Close study panel" style={iconBtn}
            onMouseEnter={e => { if (canHover()) e.currentTarget.style.background = "var(--muted)"; }}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          >
            <X size={18} style={{ color: "var(--muted-foreground)" }} />
          </button>
          </div>
        </div>
        <div role="tablist" style={{ display: "flex", borderBottom: "1px solid var(--border)" }}>
          {([
            { key: "lexicon" as const,    icon: <FileText size={13} />,      label: "Lexicon" },
            { key: "commentary" as const, icon: <MessageSquare size={13} />, label: `Commentary${commentaries.length > 0 ? ` (${commentaries.length})` : ""}` },
            { key: "ai" as const,         icon: <Sparkles size={13} />,      label: "AI Study" },
          ]).map(t => (
            <button key={t.key} onClick={() => onTabChange(t.key)} role="tab" aria-selected={tab === t.key} style={{ display: "flex", alignItems: "center", gap: "5px", minHeight: `${TAP}px`, padding: "0 10px", border: "none", background: "transparent", cursor: "pointer", fontFamily: UI, fontSize: "0.8rem", color: tab === t.key ? "var(--foreground)" : "var(--muted-foreground)", borderBottom: tab === t.key ? "2px solid var(--foreground)" : "2px solid transparent", marginBottom: "-1px" }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>
      {tab === "lexicon"    && <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}><LexiconTab verse={verse} selectedWord={selectedWord} onWordSelect={onWordSelect} onNavigateTo={onNavigateTo} onCrossRefNavigate={onCrossRefNavigate} /></div>}
      {tab === "commentary" && <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}><CommentaryTab commentaries={commentaries} verseKey={verseKey} /></div>}
      {tab === "ai"         && <AIStudyTab verse={verse} verseKey={verseKey} />}
    </div>
  );
}
