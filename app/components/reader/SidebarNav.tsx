'use client'

import { BIBLE_BOOKS, type BibleBook } from "../../data/scripture";
import { ChevronLeft, ChevronRight, BookOpen } from "lucide-react";
import { UI, TAP, canHover, backBtnStyle } from "../../ui/tokens";

export type NavLevel = "top" | "books" | "chapters";

export function langLabel(lang: string) {
  if (lang === "hebrew")  return "Biblical Hebrew";
  if (lang === "greek")   return "Koine Greek";
  if (lang === "aramaic") return "Biblical Aramaic";
  return lang;
}

export function SidebarNav({ touch, navLevel, navBook, selectedBook, selectedChapter, onGoTop, onGoBooks, onSelectBook, onSelectChapter }: {
  touch: boolean; navLevel: NavLevel; navBook: BibleBook | null; selectedBook: string; selectedChapter: number;
  onGoTop: () => void; onGoBooks: () => void;
  onSelectBook: (b: BibleBook) => void; onSelectChapter: (b: BibleBook, ch: number) => void;
}) {
  if (navLevel === "top") {
    return (
      <div style={{ padding: "8px 0" }}>
        <SidebarItem icon={<BookOpen size={14} />} label="Bible" onClick={onGoBooks} rightIcon={<ChevronRight size={13} style={{ color: "var(--muted-foreground)" }} />} />
      </div>
    );
  }

  if (navLevel === "books") {
    const ot = BIBLE_BOOKS.filter(b => b.testament === "OT");
    const nt = BIBLE_BOOKS.filter(b => b.testament === "NT");
    return (
      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <div style={{ overflowY: "auto", flex: 1, paddingTop: "4px" }}>
          <TestamentSection touch={touch} label="Old Testament" books={ot} selectedBook={selectedBook} onSelectBook={onSelectBook} />
          <TestamentSection touch={touch} label="New Testament" books={nt} selectedBook={selectedBook} onSelectBook={onSelectBook} />
        </div>
      </div>
    );
  }

  if (navLevel === "chapters" && navBook) {
    const chapters = Array.from({ length: navBook.chapters }, (_, i) => i + 1);
    return (
      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <div style={{ padding: "8px 0 4px" }}>
          <button onClick={onGoBooks} style={{ ...backBtnStyle, width: "100%", minHeight: touch ? `${TAP}px` : "28px" }}>
            <ChevronLeft size={13} /> Books
          </button>
        </div>
        <div style={{ padding: "6px 12px 2px", fontSize: "0.75rem", fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{navBook.name}</div>
        <div style={{ padding: "0 12px 6px", fontSize: "0.75rem", color: "var(--muted-foreground)" }}>{langLabel(navBook.language)}</div>
        <div style={{ height: "1px", background: "var(--sidebar-border)", margin: "0 12px 4px" }} />
        <div style={{ overflowY: "auto", flex: 1, padding: "8px 12px 16px", display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${touch ? TAP : 36}px, 1fr))`, gap: "4px", alignContent: "start" }}>
          {chapters.map(ch => {
            const sel = selectedBook === navBook.name && selectedChapter === ch;
            return (
              <button key={ch} onClick={() => onSelectChapter(navBook, ch)} aria-label={`Chapter ${ch}`} aria-current={sel ? "page" : undefined} style={{ height: `${touch ? TAP : 36}px`, borderRadius: "8px", border: "none", background: sel ? "var(--sidebar-accent)" : "transparent", cursor: "pointer", fontFamily: UI, fontSize: "0.875rem", fontVariantNumeric: "tabular-nums", color: "var(--foreground)", fontWeight: sel ? 600 : 400 }}
                onMouseEnter={e => { if (!canHover()) return; if (!sel) e.currentTarget.style.background = "var(--sidebar-accent)"; }}
                onMouseLeave={e => { if (!sel) e.currentTarget.style.background = "transparent"; }}
              >{ch}</button>
            );
          })}
        </div>
      </div>
    );
  }

  return null;
}

export function TestamentSection({ touch, label, books, selectedBook, onSelectBook }: { touch: boolean; label: string; books: BibleBook[]; selectedBook: string; onSelectBook: (b: BibleBook) => void }) {
  return (
    <div style={{ marginBottom: "8px" }}>
      <div style={{ padding: "8px 12px 4px", fontSize: "0.75rem", fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
      {books.map(b => {
        const active = b.name === selectedBook;
        return (
          <button key={b.name} onClick={() => onSelectBook(b)} style={{ width: "100%", minHeight: touch ? `${TAP}px` : "28px", textAlign: "left", padding: touch ? "0 16px" : "4px 12px", border: "none", background: active ? "var(--sidebar-accent)" : "transparent", cursor: "pointer", fontFamily: UI, fontSize: "0.875rem", color: active ? "var(--foreground)" : "var(--sidebar-foreground)", fontWeight: active ? 500 : 400, display: "flex", justifyContent: "space-between", alignItems: "center" }}
            onMouseEnter={e => { if (!canHover()) return; if (!active) e.currentTarget.style.background = "var(--sidebar-accent)"; }}
            onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
          >
            <span>{b.name}</span>
            <ChevronRight size={12} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
          </button>
        );
      })}
    </div>
  );
}

export function SidebarItem({ icon, label, onClick, rightIcon, active, indent }: { icon: React.ReactNode; label: string; onClick: () => void; rightIcon?: React.ReactNode; active?: boolean; indent?: boolean }) {
  return (
    <button onClick={onClick} style={{ width: "100%", display: "flex", alignItems: "center", gap: "8px", padding: "4px 12px", paddingLeft: indent ? "28px" : "12px", border: "none", background: active ? "var(--sidebar-accent)" : "transparent", cursor: "pointer", fontFamily: UI, fontSize: "0.875rem", color: active ? "var(--foreground)" : "var(--sidebar-foreground)", fontWeight: active ? 500 : 400 }}
      onMouseEnter={e => { if (canHover()) e.currentTarget.style.background = "var(--sidebar-accent)"; }}
      onMouseLeave={e => e.currentTarget.style.background = active ? "var(--sidebar-accent)" : "transparent"}
    >
      <span style={{ color: active ? "var(--accent)" : "var(--muted-foreground)", display: "flex" }}>{icon}</span>
      <span style={{ flex: 1, textAlign: "left" }}>{label}</span>
      {rightIcon}
    </button>
  );
}
