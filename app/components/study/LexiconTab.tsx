'use client'

import { useState, useEffect } from "react";
import { BIBLE_BOOKS, type OriginalWord, type ScriptureVerse } from "../../data/scripture";
import { cleanGloss } from "../../lib/esv";
import { UI, BODY, MONO, HE, GR, TAP, canHover } from "../../ui/tokens";

export interface CrossRef { reference: string; quote: string; highlight?: string }

// Bold the English word(s) in a verse that translate the word being searched.
// Uses the phrase the AI marked; falls back to the word's English gloss.
// Build-time concordance (scripts/build-concordance.mjs): one static file per
// hundred Strong's numbers, so finding every occurrence of a word is a single
// cached file read instead of an AI call.
export type ConcordanceEntry = { total: number; refs: [string, string][] };
export const concordanceFiles = new Map<string, Promise<Record<string, ConcordanceEntry>>>();
export const crossRefCache    = new Map<string, { total: number; results: CrossRef[] }>();

export function concordanceKey(strongs: string) {
  return (strongs || "").replace(/_[A-Z]$/, "");
}
export function concordanceBucket(key: string) {
  const m = key.match(/^([GH])(\d+)/);
  return m ? `${m[1]}${Math.floor(Number(m[2]) / 100)}` : null;
}
export function loadConcordanceFile(bucket: string) {
  let p = concordanceFiles.get(bucket);
  if (!p) {
    p = fetch(`/concordance/${bucket}.json`).then(r => {
      if (!r.ok) throw new Error("concordance unavailable");
      return r.json();
    });
    p.catch(() => concordanceFiles.delete(bucket));
    concordanceFiles.set(bucket, p);
  }
  return p;
}
// Pick up to `limit` references, taking one book at a time in canonical order
// so the list shows the word across Scripture rather than 25 verses of one book.
export function spreadAcrossBooks(refs: [string, string][], limit: number) {
  const byBook = new Map<string, [string, string][]>();
  for (const r of refs) {
    const book = r[0].replace(/\s+\d+:\d+$/, "");
    if (!byBook.has(book)) byBook.set(book, []);
    byBook.get(book)!.push(r);
  }
  const queues = [...byBook.values()];
  const picked: [string, string][] = [];
  for (let round = 0; picked.length < limit && queues.some(q => q.length > round); round++) {
    for (const q of queues) {
      if (picked.length >= limit) break;
      if (q[round]) picked.push(q[round]);
    }
  }
  const order = new Map(refs.map((r, i) => [r[0], i]));
  return picked.sort((a, b) => order.get(a[0])! - order.get(b[0])!);
}

export const HIGHLIGHT_SKIP = new Set(["a","an","the","of","to","in","on","for","and","or","but","is","was","be","are","were","will","shall","you","he","she","it","they","we","i","me","him","them","us","my","his","her","their","your","our","do","did","does","not","with","from","by","as","at","this","that","these","those","who","which","what","have","has","had","been","let","may"]);

export function HighlightedQuote({ quote, highlight, gloss }: { quote: string; highlight?: string; gloss?: string }) {
  const phrases = [highlight, gloss]
    .map(t => (t ?? "").replace(/<[^>]*>/g, " ").replace(/[\[\]]/g, "").replace(/[.,;:!?"'\u2018\u2019\u201c\u201d]+$/g, "").replace(/\s+/g, " ").trim())
    .filter(t => t.length > 0);
  // Whole phrase first, then its meaningful words (longest first), letting a
  // word of 4+ letters match with an ending, e.g. "love" finds "loved".
  const words = phrases
    .flatMap(p => p.split(/[\s\-/]+/))
    .map(w => w.replace(/[^A-Za-z']/g, ""))
    .filter(w => w.length > 2 && !HIGHLIGHT_SKIP.has(w.toLowerCase()))
    .sort((a, b) => b.length - a.length);
  const candidates = [...phrases.map(t => ({ term: t, stem: false })), ...words.map(t => ({ term: t, stem: t.length >= 4 }))];
  for (const { term, stem } of candidates) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(^|[^A-Za-z])(${escaped}${stem ? "[a-z]{0,3}" : ""})(?![A-Za-z])`, "i");
    const m = re.exec(quote);
    if (m) {
      const start = m.index + m[1].length;
      const end = start + m[2].length;
      return (
        <>
          {quote.slice(0, start)}
          <strong style={{ fontWeight: 700, color: "var(--foreground)" }}>{quote.slice(start, end)}</strong>
          {quote.slice(end)}
        </>
      );
    }
  }
  return <>{quote}</>;
}

export function parseVerseRef(ref: string): { book: string; chapter: number; verse: number } | null {
  // Match "Book Name Chapter:Verse" — book names may include numbers (e.g. "1 Kings")
  const m = ref.match(/^(.+?)\s+(\d+):(\d+)$/)
  if (!m) return null
  return { book: m[1].trim(), chapter: parseInt(m[2]), verse: parseInt(m[3]) }
}

export function LexiconTab({ verse, selectedWord, onWordSelect, onNavigateTo, onCrossRefNavigate }: {
  verse: ScriptureVerse; selectedWord: OriginalWord | null; onWordSelect: (w: OriginalWord) => void;
  onNavigateTo: (book: string, chapter: number, verse: number | null, pushHistory?: boolean) => void;
  onCrossRefNavigate: (book: string, chapter: number, verse: number) => void;
}) {
  const isHebrew = verse.language === "hebrew";
  const origFont = isHebrew ? HE : GR;

  const [crossRefs,        setCrossRefs]        = useState<CrossRef[]>([]);
  const [crossRefTotal,    setCrossRefTotal]    = useState<number | null>(null);
  const [crossRefLoading,  setCrossRefLoading]  = useState(false);
  const [crossRefError,    setCrossRefError]    = useState<string | null>(null);
  const [crossRefExpanded, setCrossRefExpanded] = useState(false);

  useEffect(() => {
    if (!selectedWord) {
      setCrossRefs([]);
      setCrossRefTotal(null);
      setCrossRefError(null);
      setCrossRefExpanded(false);
      return;
    }
    const currentVerse = `${verse.book} ${verse.chapter}:${verse.verse}`;
    const key = concordanceKey(selectedWord.strongsNumber);
    const cacheKey = `${key}|${currentVerse}`;

    setCrossRefExpanded(false);
    setCrossRefError(null);
    const cached = crossRefCache.get(cacheKey);
    if (cached) {
      setCrossRefTotal(cached.total);
      setCrossRefs(cached.results);
      setCrossRefLoading(false);
      return;
    }
    setCrossRefs([]);
    setCrossRefTotal(null);
    setCrossRefLoading(true);

    let cancelled = false;
    const bucket = concordanceBucket(key);
    (async () => {
      if (!bucket) throw new Error("No concordance entry for this word.");
      const file  = await loadConcordanceFile(bucket);
      const refs  = (file[key]?.refs ?? []).filter(r => r[0] !== currentVerse);
      if (cancelled) return;
      setCrossRefTotal(refs.length);
      if (refs.length === 0) { crossRefCache.set(cacheKey, { total: 0, results: [] }); return; }

      const picked = spreadAcrossBooks(refs, 25);
      const glossFor = new Map(picked.map(r => [r[0], cleanGloss(r[1])]));
      const res  = await fetch("/api/cross-references", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ references: picked.map(r => r[0]) }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const results: CrossRef[] = (Array.isArray(data.results) ? data.results : []).map((r: CrossRef) => ({
        ...r,
        highlight: glossFor.get(r.reference),
      }));
      crossRefCache.set(cacheKey, { total: refs.length, results });
      if (!cancelled) setCrossRefs(results);
    })()
      .catch(err => { if (!cancelled) setCrossRefError(err instanceof Error && err.message ? err.message : "Failed to load cross-references."); })
      .finally(() => { if (!cancelled) setCrossRefLoading(false); });

    return () => { cancelled = true; };
  }, [selectedWord, verse.book, verse.chapter, verse.verse]);

  if (!selectedWord) {
    return (
      <div>
        <p style={{ fontFamily: UI, fontSize: "0.85rem", color: "var(--muted-foreground)", marginBottom: "16px", lineHeight: 1.6 }}>Select a word to view its lexical entry.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))", gap: "6px", direction: isHebrew ? "rtl" : "ltr" }}>
          {verse.words.map(w => (
            <button key={w.id} onClick={() => onWordSelect(w)} style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", gap: "2px", padding: "8px 6px", minWidth: 0, borderRadius: "6px", border: "1px solid var(--border)", background: "transparent", cursor: "pointer", color: "var(--foreground)", direction: "ltr", textAlign: "center" }}
              onMouseEnter={e => { if (canHover()) e.currentTarget.style.background = "var(--muted)"; }}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <span lang={isHebrew ? "he" : "grc"} style={{ fontFamily: origFont, fontSize: isHebrew ? "1.25rem" : "1.15rem", lineHeight: 1.3, direction: isHebrew ? "rtl" : "ltr" }}>{w.original}</span>
              <span style={{ fontFamily: MONO, fontSize: "0.75rem", color: "var(--muted-foreground)", overflowWrap: "anywhere" }}>{w.transliteration}</span>
              <span style={{ fontFamily: UI, fontSize: "0.75rem", fontWeight: 500, lineHeight: 1.3, color: "var(--accent-text)" }}>{w.gloss}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div style={{ padding: "16px", borderRadius: "8px", background: "var(--muted)" }}>
        <div lang={isHebrew ? "he" : "grc"} dir={isHebrew ? "rtl" : "ltr"} style={{ fontFamily: origFont, fontSize: isHebrew ? "2.25rem" : "2rem", lineHeight: 1.25, color: "var(--foreground)", marginBottom: "4px", textAlign: "left" }}>{selectedWord.original}</div>
        <div style={{ fontFamily: MONO, fontSize: "0.9rem", color: "var(--muted-foreground)", marginBottom: "6px" }}>{selectedWord.transliteration}</div>
        <div style={{ fontFamily: BODY, fontStyle: "italic", fontSize: "0.85rem", color: "var(--muted-foreground)" }}>&ldquo;{selectedWord.gloss}&rdquo;</div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        {([["Lemma", selectedWord.lemma], ["Part of Speech", selectedWord.partOfSpeech]] as [string, string][]).map(([label, value]) => (
          <div key={label} style={{ display: "flex", alignItems: "baseline", gap: "8px", padding: "4px 0", borderBottom: "1px solid var(--border)" }}>
            <span style={{ fontFamily: UI, fontSize: "0.8rem", color: "var(--muted-foreground)", minWidth: "110px", flexShrink: 0 }}>{label}</span>
            <span style={{ fontFamily: MONO, fontSize: "0.8rem", color: "var(--foreground)" }}>{value}</span>
          </div>
        ))}
      </div>

      <div style={{ borderLeft: "3px solid var(--border)", paddingLeft: "12px" }}>
        <div style={{ fontFamily: UI, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted-foreground)", marginBottom: "6px" }}>Lexical Notes</div>
        <p style={{ fontFamily: BODY, fontSize: "0.9rem", lineHeight: 1.8, color: "var(--foreground)", margin: 0 }}>{selectedWord.extendedDefinition}</p>
      </div>

      <div>
        <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginBottom: "8px" }}>
          <div style={{ fontFamily: UI, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted-foreground)" }}>
            Used elsewhere in Scripture
          </div>
          {crossRefTotal !== null && (
            <span style={{ fontFamily: MONO, fontSize: "0.75rem", color: "var(--muted-foreground)" }}>
              {crossRefTotal.toLocaleString()}×
            </span>
          )}
        </div>

        {crossRefLoading && (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} style={{ height: "70px", borderRadius: "6px", background: "var(--muted)", opacity: 0.4 + i * 0.1, animation: "pulse 1.4s ease-in-out infinite" }} />
            ))}
            <p style={{ fontFamily: UI, fontSize: "0.75rem", color: "var(--muted-foreground)", margin: "4px 0 0", fontStyle: "italic" }}>
              {crossRefTotal !== null ? "Loading verses…" : `Searching ${BIBLE_BOOKS.find(b => b.name === verse.book)?.testament === "OT" ? "Old" : "New"} Testament…`}
            </p>
          </div>
        )}

        {crossRefError && (
          <p style={{ fontFamily: UI, fontSize: "0.82rem", color: "var(--destructive)", fontStyle: "italic" }}>{crossRefError}</p>
        )}

        {!crossRefLoading && !crossRefError && crossRefs.length === 0 && crossRefTotal !== null && (
          <p style={{ fontFamily: UI, fontSize: "0.82rem", color: "var(--muted-foreground)", fontStyle: "italic" }}>
            No other occurrences found for {selectedWord.strongsNumber}.
          </p>
        )}

        {!crossRefLoading && crossRefs.length > 0 && (() => {
          const visible = crossRefExpanded ? crossRefs : crossRefs.slice(0, 10);
          const hidden  = crossRefs.length - 10;
          return (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {visible.map((ref) => {
                const parsed = parseVerseRef(ref.reference);
                return (
                  <button
                    key={ref.reference}
                    onClick={() => { if (parsed) onCrossRefNavigate(parsed.book, parsed.chapter, parsed.verse); }}
                    disabled={!parsed}
                    style={{ textAlign: "left", padding: "10px 12px", borderRadius: "6px", border: "1px solid var(--border)", background: "transparent", cursor: parsed ? "pointer" : "default", display: "flex", flexDirection: "column", gap: "4px" }}
                    onMouseEnter={e => { if (!canHover()) return; if (parsed) e.currentTarget.style.background = "var(--muted)"; }}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <span style={{ fontFamily: MONO, fontSize: "0.75rem", color: "var(--accent-text)", fontWeight: 500 }}>
                      {ref.reference}
                    </span>
                    <p style={{ fontFamily: BODY, fontSize: "0.82rem", lineHeight: 1.65, color: "var(--foreground)", margin: 0 }}>
                      <HighlightedQuote quote={ref.quote} highlight={ref.highlight} gloss={selectedWord.gloss} />
                    </p>
                  </button>
                );
              })}
              {!crossRefExpanded && hidden > 0 && (
                <button
                  onClick={() => setCrossRefExpanded(true)}
                  style={{ minHeight: `${TAP}px`, padding: "8px 12px", borderRadius: "6px", border: "1px dashed var(--border)", background: "transparent", cursor: "pointer", fontFamily: UI, fontSize: "0.78rem", color: "var(--muted-foreground)" }}
                  onMouseEnter={e => { if (canHover()) e.currentTarget.style.background = "var(--muted)"; }}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  Show {hidden} more result{hidden !== 1 ? "s" : ""}
                </button>
              )}
              {crossRefExpanded && crossRefs.length > 10 && (
                <button
                  onClick={() => setCrossRefExpanded(false)}
                  style={{ minHeight: `${TAP}px`, padding: "8px 12px", borderRadius: "6px", border: "1px dashed var(--border)", background: "transparent", cursor: "pointer", fontFamily: UI, fontSize: "0.78rem", color: "var(--muted-foreground)" }}
                  onMouseEnter={e => { if (canHover()) e.currentTarget.style.background = "var(--muted)"; }}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  Show less
                </button>
              )}
            </div>
          );
        })()}
      </div>

      <div>
        <div style={{ fontFamily: UI, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted-foreground)", marginBottom: "8px" }}>Other words in this verse</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
          {verse.words.filter(w => w.id !== selectedWord.id).map(w => (
            <button key={w.id} onClick={() => onWordSelect(w)}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1px", minHeight: `${TAP}px`, minWidth: `${TAP}px`, padding: "4px 10px", borderRadius: "6px", border: "1px solid var(--border)", background: "transparent", cursor: "pointer" }}
              onMouseEnter={e => { if (canHover()) e.currentTarget.style.background = "var(--muted)"; }}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <span lang={isHebrew ? "he" : "grc"} style={{ fontFamily: origFont, fontSize: isHebrew ? "1rem" : "0.95rem", color: "var(--foreground)" }}>{w.original}</span>
              <span style={{ fontFamily: MONO, fontSize: "0.75rem", color: "var(--muted-foreground)" }}>{w.transliteration}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
