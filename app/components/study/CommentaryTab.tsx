'use client'

import { useState } from "react";
import { type Commentary } from "../../data/scripture";
import { UI, BODY, TAP } from "../../ui/tokens";

export function CommentaryTab({ commentaries, verseKey }: { commentaries: Commentary[]; verseKey: string }) {
  return (
    <div>
      {commentaries.length === 0 ? (
        <p style={{ fontFamily: UI, fontSize: "0.875rem", color: "var(--muted-foreground)", fontStyle: "italic" }}>
          No classical commentaries are indexed for {verseKey}. Try the AI Study tab to explore this passage.
        </p>
      ) : (
        <div>
          <div style={{ padding: "10px 12px", borderRadius: "6px", background: "var(--muted)", marginBottom: "20px", fontSize: "0.8rem", fontFamily: UI, color: "var(--muted-foreground)", lineHeight: 1.6 }}>
            These are <strong style={{ color: "var(--foreground)" }}>scholarly interpretations</strong>, not Scripture. Evaluate alongside the biblical text.
          </div>
          {commentaries.map((c, i) => {
            const range = c.verseStart !== undefined && c.verseEnd !== undefined && c.verseEnd > c.verseStart
              ? `On verses ${c.verseStart}–${c.verseEnd}` : null;
            return (
              <article key={c.id} style={{ paddingBottom: "20px", marginBottom: "20px", borderBottom: i < commentaries.length - 1 ? "1px solid var(--border)" : "none" }}>
                <h3 style={{ fontFamily: UI, fontSize: "0.9rem", fontWeight: 600, color: "var(--foreground)", margin: "0 0 2px" }}>{c.author}</h3>
                <div style={{ fontFamily: UI, fontSize: "0.75rem", color: "var(--muted-foreground)", marginBottom: "10px", lineHeight: 1.5 }}>
                  {[c.source, c.era, range].filter(Boolean).join(" · ")}
                </div>
                <CommentaryText text={c.text} />
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Commentary often arrives as one long block. Split it into paragraphs of a
// few sentences, and fold anything past the first two behind "Read more".
export function commentaryParagraphs(text: string): string[] {
  const given = text.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  if (given.length > 1) return given;
  const sentences = text.trim().split(/(?<=[.!?])\s+(?=[A-Z“"‘'(])/);
  const paras: string[] = [];
  for (let i = 0; i < sentences.length; i += 3) paras.push(sentences.slice(i, i + 3).join(" "));
  return paras;
}

export function CommentaryText({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const paras = commentaryParagraphs(text);
  const shown = open ? paras : paras.slice(0, 2);
  return (
    <div>
      {shown.map((para, j) => (
        <p key={j} style={{ fontFamily: BODY, fontSize: "0.95rem", lineHeight: 1.75, color: "var(--foreground)", margin: j ? "12px 0 0" : 0 }}>{para}</p>
      ))}
      {paras.length > 2 && (
        <button onClick={() => setOpen(o => !o)} aria-expanded={open} style={{ minHeight: `${TAP}px`, padding: "0", marginTop: "4px", border: "none", background: "transparent", cursor: "pointer", fontFamily: UI, fontSize: "0.85rem", fontWeight: 500, color: "var(--accent-text)" }}>
          {open ? "Show less" : "Read more"}
        </button>
      )}
    </div>
  );
}
