'use client'

import { useState } from "react";
import { type OriginalWord, type ScriptureVerse } from "../../data/scripture";
import { Chip } from "../../ui/controls";
import { UI, BODY, MONO, HE, GR, TAP, canHover } from "../../ui/tokens";

export function VerseRow({ verse, compact, isActive, selectedWord, commentaryCount, onToggle, onWordSelect }: {
  verse: ScriptureVerse; compact: boolean; isActive: boolean; selectedWord: OriginalWord | null;
  commentaryCount: number; onToggle: () => void; onWordSelect: (w: OriginalWord) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const layout = verse.layout;
  const gapAbove = layout && verse.verse > 1 && (layout.paraStart || layout.stanzaBreak) ? "14px" : 0;
  return (
    <>
    {layout?.heading && (
      <h2 style={{ fontFamily: UI, fontSize: "0.95rem", fontWeight: 600, lineHeight: 1.4, color: "var(--foreground)", margin: verse.verse > 1 ? "28px 8px 6px" : "4px 8px 6px" }}>{layout.heading}</h2>
    )}
    <div data-verse={verse.verse} onMouseEnter={() => { if (canHover()) setHovered(true); }} onMouseLeave={() => setHovered(false)}
      style={{ borderRadius: "6px", background: isActive ? "var(--muted)" : hovered ? "var(--secondary)" : "transparent", transition: "background 0.08s", marginBottom: "2px", marginTop: layout?.heading ? 0 : gapAbove }}
    >
      <button onClick={onToggle} aria-expanded={isActive} style={{ width: "100%", textAlign: "left", display: "flex", gap: compact ? "10px" : "12px", padding: "6px 8px", border: "none", background: "transparent", cursor: "pointer", borderRadius: "6px" }}>
        <span style={{ fontFamily: MONO, fontSize: "0.75rem", color: "var(--muted-foreground)", minWidth: compact ? "20px" : "24px", paddingTop: "5px", flexShrink: 0, userSelect: "none", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "4px" }}>
          {verse.verse}
          {compact && commentaryCount > 0 && (
            <span title={`${commentaryCount} commentary note${commentaryCount !== 1 ? "s" : ""}`} style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--accent-text)" }} />
          )}
        </span>
        <span style={{ fontFamily: BODY, fontSize: "calc(1rem * var(--verse-scale, 1))", lineHeight: 1.85, color: "var(--foreground)", flex: 1 }}>
          {layout?.poetry
            ? layout.lines.map((l, i) => l.indent < 0
                ? <span key={i} aria-hidden="true" style={{ display: "block", height: "0.75em" }} />
                : <span key={i} style={{ display: "block", paddingLeft: `${1.5 + l.indent * 1.5}em`, textIndent: "-1.5em" }}>{l.text}</span>)
            : verse.text}
        </span>
        {!compact && <div style={{ display: "flex", alignItems: "flex-start", gap: "4px", paddingTop: "4px", flexShrink: 0, opacity: hovered || isActive ? 1 : 0, transition: "opacity 0.1s" }}>
          <Chip>Lexicon</Chip>
          {commentaryCount > 0 && <Chip>{commentaryCount} note{commentaryCount !== 1 ? "s" : ""}</Chip>}
        </div>}
      </button>
      {/* On a phone the study sheet already shows these words, so skip the copy here. */}
      {isActive && !compact && (
        <div style={{ padding: "4px 8px 12px 44px" }}>
          <InterlinearStrip verse={verse} selectedWord={selectedWord} onWordSelect={onWordSelect} />
        </div>
      )}
    </div>
    </>
  );
}

// ── Interlinear strip ─────────────────────────────────────────────────────────

export function InterlinearStrip({ verse, selectedWord, onWordSelect }: { verse: ScriptureVerse; selectedWord: OriginalWord | null; onWordSelect: (w: OriginalWord) => void }) {
  const isHebrew = verse.language === "hebrew";
  const origFont = isHebrew ? HE : GR;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 12px", direction: isHebrew ? "rtl" : "ltr", paddingTop: "8px" }}>
      {verse.words.map(word => {
        const sel = selectedWord?.id === word.id;
        return (
          <button key={word.id} onClick={() => onWordSelect(word)} aria-pressed={sel} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", minWidth: `${TAP}px`, padding: "6px 8px", borderRadius: "6px", border: "none", cursor: "pointer", background: sel ? "var(--background)" : "transparent", boxShadow: sel ? "0 0 0 1px var(--border), var(--shadow-sm)" : "none" }}
            onMouseEnter={e => { if (!canHover()) return; if (!sel) e.currentTarget.style.background = "var(--hover)"; }}
            onMouseLeave={e => { if (!sel) e.currentTarget.style.background = "transparent"; }}
          >
            <span lang={isHebrew ? "he" : "grc"} style={{ fontFamily: origFont, fontSize: isHebrew ? "1.15rem" : "1.05rem", lineHeight: 1.35, color: sel ? "var(--accent-text)" : "var(--foreground)", direction: isHebrew ? "rtl" : "ltr" }}>{word.original}</span>
            <span style={{ fontFamily: MONO, fontSize: "0.75rem", color: "var(--muted-foreground)", direction: "ltr" }}>{word.transliteration}</span>
            <span style={{ fontFamily: UI, fontSize: "0.75rem", color: "var(--muted-foreground)", direction: "ltr" }}>{word.gloss}</span>
          </button>
        );
      })}
    </div>
  );
}
