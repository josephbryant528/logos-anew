'use client'

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import {
  PASSAGES, BIBLE_BOOKS, BibleBook, OriginalWord, ScriptureVerse,
  getCommentariesForVerse, Commentary
} from "./data/scripture";
import {
  ChevronLeft, ChevronRight, X, Moon, Sun,
  FileText, MessageSquare, BookOpen, ArrowLeft, Sparkles, Send
} from "lucide-react";

const UI   = "'Inter', system-ui, sans-serif";
const BODY = "'Lora', serif";
const MONO = "'DM Mono', monospace";
const HE   = "'Noto Serif Hebrew', 'Noto Serif', serif";
const GR   = "'Noto Serif', serif";

type NavLevel = "top" | "books" | "chapters";

function bookSlugLocal(name: string) { return name.toLowerCase().replace(/\s+/g, '-') }

interface Location { book: string; chapter: number; verse: number | null }

// Parses [SCRIPTURE:ref] and [COMMENTARY:Author] badges from AI output
function parseBadges(text: string) {
  const parts: { type: string; value: string }[] = [];
  const regex = /\[(SCRIPTURE|COMMENTARY):([^\]]+)\]/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push({ type: "text", value: text.slice(last, match.index) });
    parts.push({ type: match[1], value: match[2].trim() });
    last = regex.lastIndex;
  }
  if (last < text.length) parts.push({ type: "text", value: text.slice(last) });
  return parts;
}

function BadgedText({ text }: { text: string }) {
  const parts = parseBadges(text);
  return (
    <>
      {parts.map((p, i) => {
        if (p.type === "SCRIPTURE") {
          return (
            <span key={i} style={{ display: "inline-block", background: "#fffbea", border: "1px solid #b8972e", color: "#7a5c00", borderRadius: "3px", padding: "0 0.4em", fontSize: "0.82em", fontWeight: "bold", margin: "0 0.1em", verticalAlign: "middle" }}>
              {p.value}
            </span>
          );
        }
        if (p.type === "COMMENTARY") {
          return (
            <span key={i} style={{ display: "inline-block", background: "#eff6ff", border: "1px solid #2563eb", color: "#1e40af", borderRadius: "3px", padding: "0 0.4em", fontSize: "0.82em", fontWeight: "bold", margin: "0 0.1em", verticalAlign: "middle" }}>
              {p.value}
            </span>
          );
        }
        return <span key={i}>{p.value}</span>;
      })}
    </>
  );
}

// Renders inline markdown: **bold**, *italic*, [SCRIPTURE/COMMENTARY:x] badges
function InlineText({ text }: { text: string }) {
  // Split on bold (**...**), italic (*...*), and badges
  const tokens: React.ReactNode[] = [];
  const re = /\*\*([^*]+)\*\*|\*([^*]+)\*|\[SCRIPTURE:([^\]]+)\]|\[COMMENTARY:([^\]]+)\]/g;
  let last = 0, m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) tokens.push(text.slice(last, m.index));
    if (m[1] !== undefined) tokens.push(<strong key={m.index}>{m[1]}</strong>);
    else if (m[2] !== undefined) tokens.push(<em key={m.index}>{m[2]}</em>);
    else if (m[3] !== undefined) tokens.push(
      <span key={m.index} style={{ display: "inline-block", background: "#fffbea", border: "1px solid #b8972e", color: "#7a5c00", borderRadius: "3px", padding: "0 0.4em", fontSize: "0.82em", fontWeight: "bold", margin: "0 0.1em", verticalAlign: "middle" }}>{m[3]}</span>
    );
    else if (m[4] !== undefined) tokens.push(
      <span key={m.index} style={{ display: "inline-block", background: "#eff6ff", border: "1px solid #2563eb", color: "#1e40af", borderRadius: "3px", padding: "0 0.4em", fontSize: "0.82em", fontWeight: "bold", margin: "0 0.1em", verticalAlign: "middle" }}>{m[4]}</span>
    );
    last = re.lastIndex;
  }
  if (last < text.length) tokens.push(text.slice(last));
  return <>{tokens}</>;
}

// Renders a full markdown AI response: headings, bullets, horizontal rules, bold/italic
function MarkdownText({ text }: { text: string }) {
  const lines = text.split('\n');
  const nodes: React.ReactNode[] = [];
  let listItems: string[] = [];

  function flushList() {
    if (listItems.length === 0) return;
    nodes.push(
      <ul key={nodes.length} style={{ margin: "4px 0 8px", paddingLeft: "18px", display: "flex", flexDirection: "column", gap: "2px" }}>
        {listItems.map((li, i) => (
          <li key={i} style={{ lineHeight: 1.65 }}><InlineText text={li} /></li>
        ))}
      </ul>
    );
    listItems = [];
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Horizontal rule
    if (/^---+$/.test(trimmed)) {
      flushList();
      nodes.push(<hr key={nodes.length} style={{ border: "none", borderTop: "1px solid var(--border)", margin: "10px 0" }} />);
      continue;
    }

    // Headings
    const h3 = trimmed.match(/^###\s+(.+)/);
    const h2 = trimmed.match(/^##\s+(.+)/);
    const h1 = trimmed.match(/^#\s+(.+)/);
    if (h1 || h2 || h3) {
      flushList();
      const content = (h1 || h2 || h3)![1];
      const size = h1 ? "1rem" : h2 ? "0.9rem" : "0.85rem";
      const mt   = h1 ? "14px" : "10px";
      nodes.push(
        <p key={nodes.length} style={{ fontFamily: UI, fontWeight: 700, fontSize: size, color: "var(--foreground)", margin: `${mt} 0 4px` }}>
          <InlineText text={content} />
        </p>
      );
      continue;
    }

    // Bullet list items (-, *, •)
    const bullet = trimmed.match(/^[-*•]\s+(.+)/);
    if (bullet) {
      listItems.push(bullet[1]);
      continue;
    }

    // Blank line
    if (!trimmed) {
      flushList();
      continue;
    }

    // Normal paragraph line
    flushList();
    nodes.push(
      <p key={nodes.length} style={{ margin: "0 0 6px", lineHeight: 1.75 }}>
        <InlineText text={trimmed} />
      </p>
    );
  }
  flushList();
  return <div style={{ fontFamily: BODY, fontSize: "0.875rem", color: "var(--foreground)" }}>{nodes}</div>;
}

export default function App() {
  const [navLevel, setNavLevel] = useState<NavLevel>("top");
  const [navBook,  setNavBook]  = useState<BibleBook | null>(null);

  const [selectedBook,    setSelectedBook]    = useState("John");
  const [selectedChapter, setSelectedChapter] = useState(1);
  const [activeVerse,     setActiveVerse]     = useState<ScriptureVerse | null>(null);
  const [selectedWord,    setSelectedWord]    = useState<OriginalWord | null>(null);
  const [detailTab,       setDetailTab]       = useState<"lexicon" | "commentary" | "ai">("lexicon");

  const [history, setHistory] = useState<Location[]>([]);
  const [darkMode,       setDarkMode]       = useState(false);
  const [sidebarOpen,    setSidebarOpen]    = useState(true);
  const [dynamicVerses,  setDynamicVerses]  = useState<ScriptureVerse[]>([]);
  const [versesLoading,  setVersesLoading]  = useState(false);
  const [versesError,    setVersesError]    = useState<string | null>(null);
  const chapterCache     = useRef<Map<string, ScriptureVerse[]>>(new Map());
  const commentaryCache  = useRef<Map<string, Commentary[]>>(new Map());

  const fetchVerses = useCallback(async (book: string, chapter: number) => {
    const cacheKey = `${book}:${chapter}`;
    const cached = chapterCache.current.get(cacheKey);
    if (cached) {
      setDynamicVerses(cached);
      setVersesError(null);
      return;
    }
    setVersesLoading(true);
    setVersesError(null);
    setDynamicVerses([]);
    try {
      const [esvRes, lexRes, comRes] = await Promise.allSettled([
        fetch(`/api/passage?q=${encodeURIComponent(`${book} ${chapter}`)}`)
          .then(r => r.ok ? r.json() : Promise.reject(new Error(`ESV ${r.status}`))),
        fetch(`/api/lexicon?book=${encodeURIComponent(book)}&chapter=${chapter}`)
          .then(r => r.ok ? r.json() : Promise.reject(new Error(`Lexicon ${r.status}`))),
        fetch(`/api/commentary?book=${encodeURIComponent(book)}&chapter=${chapter}`)
          .then(r => r.ok ? r.json() : null),
      ]);

      const esvData = esvRes.status === 'fulfilled' ? esvRes.value : null;
      const lexData = lexRes.status === 'fulfilled' ? lexRes.value : null;
      const comData = comRes.status === 'fulfilled' ? comRes.value : null;

      // Cache commentary entries for this chapter
      if (comData?.entries?.length > 0) {
        const entries: Commentary[] = comData.entries.map((e: { verseStart: number; verseEnd: number; text: string }, i: number) => ({
          id:         `mhcc-${bookSlugLocal(book)}-${chapter}-${i}`,
          source:     comData.source,
          author:     comData.author,
          era:        comData.era,
          verseKey:   `${book} ${chapter}:${e.verseStart}`,
          verseStart: e.verseStart,
          verseEnd:   e.verseEnd,
          text:       e.text,
        }));
        commentaryCache.current.set(cacheKey, entries);
      }

      const verseTexts = splitEsvIntoVerses(esvData?.passage ?? '');
      const lexVerses: ScriptureVerse[] = lexData?.verses ?? [];
      const bookMeta = BIBLE_BOOKS.find(b => b.name === book);
      const language = (bookMeta?.language ?? 'greek') as ScriptureVerse['language'];

      let result: ScriptureVerse[] = [];

      if (lexVerses.length > 0) {
        lexVerses.forEach(v => { v.text = verseTexts[v.verse] ?? ''; v.translation = 'ESV'; });
        const interlinearNums = new Set(lexVerses.map(v => v.verse));
        const textOnlyVerses: ScriptureVerse[] = Object.entries(verseTexts)
          .filter(([n]) => !interlinearNums.has(parseInt(n)))
          .map(([n, text]) => ({ book, chapter, verse: parseInt(n), language, text, translation: 'ESV', words: [] }));
        result = [...lexVerses, ...textOnlyVerses].sort((a, b) => a.verse - b.verse);
      } else if (Object.keys(verseTexts).length > 0) {
        result = Object.entries(verseTexts)
          .map(([n, text]) => ({ book, chapter, verse: parseInt(n), language, text, translation: 'ESV', words: [] }))
          .sort((a, b) => a.verse - b.verse);
      }

      if (result.length === 0) {
        const esvErr = esvRes.status === 'rejected' ? (esvRes.reason as Error).message : null;
        setVersesError(esvErr ?? 'No text available for this chapter.');
      } else {
        chapterCache.current.set(cacheKey, result);
        setDynamicVerses(result);
      }
    } catch {
      setVersesError('Failed to load chapter. Check your connection and try again.');
    } finally {
      setVersesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVerses(selectedBook, selectedChapter);
  }, [selectedBook, selectedChapter, fetchVerses]);

  const verses = dynamicVerses;

  const commentaries = useMemo(() => {
    if (!activeVerse) return [];
    const cacheKey = `${activeVerse.book}:${activeVerse.chapter}`;
    const dynamic  = commentaryCache.current.get(cacheKey) ?? [];
    return getCommentariesForVerse(activeVerse.book, activeVerse.chapter, activeVerse.verse, dynamic);
  }, [activeVerse]);

  const currentBookMeta = BIBLE_BOOKS.find(b => b.name === selectedBook);
  const chapterCount = currentBookMeta?.chapters ?? 1;

  const navigateTo = (book: string, chapter: number, verse: number | null, pushHistory = true) => {
    if (pushHistory) {
      setHistory(h => [...h, { book: selectedBook, chapter: selectedChapter, verse: activeVerse?.verse ?? null }]);
    }
    setSelectedBook(book);
    setSelectedChapter(chapter);
    if (verse !== null) {
      const target = dynamicVerses.find(v => v.book === book && v.chapter === chapter && v.verse === verse);
      setActiveVerse(target ?? null);
    } else {
      setActiveVerse(null);
    }
    setSelectedWord(null);
  };

  const navigateBack = () => {
    const prev = history[history.length - 1];
    if (!prev) return;
    setHistory(h => h.slice(0, -1));
    setSelectedBook(prev.book);
    setSelectedChapter(prev.chapter);
    if (prev.verse !== null) {
      const target = dynamicVerses.find(v => v.book === prev.book && v.chapter === prev.chapter && v.verse === prev.verse);
      setActiveVerse(target ?? null);
    } else {
      setActiveVerse(null);
    }
    setSelectedWord(null);
  };

  const handleVerseClick = (verse: ScriptureVerse) => {
    if (activeVerse?.verse === verse.verse) {
      setActiveVerse(null);
      setSelectedWord(null);
    } else {
      setActiveVerse(verse);
      setSelectedWord(null);
      setDetailTab("lexicon");
    }
  };

  const handleSelectChapter = (book: BibleBook, ch: number) => {
    setSelectedBook(book.name);
    setSelectedChapter(ch);
    setActiveVerse(null);
    setSelectedWord(null);
    setHistory([]);
  };

  return (
    <div className={darkMode ? "dark" : ""} style={{ height: "100vh", display: "flex", flexDirection: "column", background: "var(--background)", color: "var(--foreground)", fontFamily: UI }}>

      {/* Topbar */}
      <header style={{ height: "45px", display: "flex", alignItems: "center", gap: "8px", padding: "0 12px", borderBottom: "1px solid var(--border)", background: "var(--background)", flexShrink: 0 }}>
        <button style={iconBtn} onClick={() => setSidebarOpen(o => !o)}
          onMouseEnter={e => (e.currentTarget.style.background = "var(--muted)")}
          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
        >
          <BookOpen size={16} style={{ color: "var(--muted-foreground)" }} />
        </button>

        {history.length > 0 && (
          <button style={{ ...iconBtn, gap: "4px", fontSize: "0.8rem", color: "var(--muted-foreground)" }} onClick={navigateBack}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--muted)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            <ArrowLeft size={14} />
            <span>Back</span>
          </button>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: "4px", flex: 1, fontSize: "0.875rem" }}>
          <span style={{ color: "var(--muted-foreground)" }}>Verbum</span>
          <span style={{ color: "var(--border)" }}>/</span>
          <span style={{ color: "var(--foreground)", fontWeight: 500 }}>{selectedBook}</span>
          <span style={{ color: "var(--border)" }}>/</span>
          <span style={{ color: "var(--foreground)", fontWeight: 500 }}>Chapter {selectedChapter}</span>
        </div>

        <NavBtn onClick={() => { if (selectedChapter > 1) { setSelectedChapter(c => c - 1); setActiveVerse(null); } }} disabled={selectedChapter <= 1}>
          <ChevronLeft size={14} />
        </NavBtn>
        <NavBtn onClick={() => { if (selectedChapter < chapterCount) { setSelectedChapter(c => c + 1); setActiveVerse(null); } }} disabled={selectedChapter >= chapterCount}>
          <ChevronRight size={14} />
        </NavBtn>
        <NavBtn onClick={() => setDarkMode(d => !d)}>
          {darkMode ? <Sun size={15} style={{ color: "var(--muted-foreground)" }} /> : <Moon size={15} style={{ color: "var(--muted-foreground)" }} />}
        </NavBtn>
      </header>

      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>

        {/* Sidebar */}
        {sidebarOpen && (
          <aside style={{ width: "240px", flexShrink: 0, background: "var(--sidebar)", borderRight: "1px solid var(--sidebar-border)", display: "flex", flexDirection: "column", overflowY: "auto" }}>
            <SidebarNav
              navLevel={navLevel}
              navBook={navBook}
              selectedBook={selectedBook}
              selectedChapter={selectedChapter}
              onGoTop={() => setNavLevel("top")}
              onGoBooks={() => setNavLevel("books")}
              onSelectBook={(b) => { setNavBook(b); setNavLevel("chapters"); }}
              onSelectChapter={handleSelectChapter}
            />
          </aside>
        )}

        {/* Main reading pane */}
        <main style={{ flex: 1, overflowY: "auto" }}>
          <div style={{ maxWidth: "720px", margin: "0 auto", padding: "60px 96px 120px" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "6px" }}>📖</div>
            <h1 style={{ fontFamily: UI, fontSize: "1.875rem", fontWeight: 700, color: "var(--foreground)", marginBottom: "4px" }}>
              {selectedBook}
            </h1>
            <p style={{ fontSize: "0.875rem", color: "var(--muted-foreground)", marginBottom: "32px" }}>
              Chapter {selectedChapter}
              {currentBookMeta && <> · {langLabel(currentBookMeta.language)}</>}
            </p>
            <div style={{ height: "1px", background: "var(--border)", marginBottom: "32px" }} />

            {versesLoading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} style={{ height: "24px", borderRadius: "4px", background: "var(--muted)", opacity: 0.5 + i * 0.04, animation: "pulse 1.4s ease-in-out infinite" }} />
                ))}
              </div>
            ) : versesError ? (
              <div style={{ padding: "20px", borderRadius: "8px", background: "var(--muted)", fontSize: "0.875rem", color: "var(--muted-foreground)", fontFamily: BODY, fontStyle: "italic", lineHeight: 1.7 }}>
                {versesError}
              </div>
            ) : (
              <div>
                {verses.map(verse => (
                  <VerseRow
                    key={verse.verse}
                    verse={verse}
                    isActive={activeVerse?.verse === verse.verse}
                    selectedWord={selectedWord}
                    commentaryCount={getCommentariesForVerse(verse.book, verse.chapter, verse.verse).length}
                    onToggle={() => handleVerseClick(verse)}
                    onWordSelect={(w) => setSelectedWord(prev => prev?.id === w.id ? null : w)}
                  />
                ))}
              </div>
            )}
          </div>
        </main>

        {/* Detail panel */}
        {activeVerse && (
          <aside style={{ width: "380px", flexShrink: 0, borderLeft: "1px solid var(--border)", background: "var(--background)", display: "flex", flexDirection: "column" }}>
            <DetailPanel
              verse={activeVerse}
              commentaries={commentaries}
              selectedWord={selectedWord}
              tab={detailTab}
              onTabChange={setDetailTab}
              onWordSelect={(w) => setSelectedWord(prev => prev?.id === w.id ? null : w)}
              onClose={() => { setActiveVerse(null); setSelectedWord(null); }}
              onNavigateTo={navigateTo}
            />
          </aside>
        )}
      </div>
    </div>
  );
}

// ESV API returns verse numbers as "(1)" — split the passage block into individual verses.
function splitEsvIntoVerses(passage: string): Record<number, string> {
  const result: Record<number, string> = {};
  // Matches both (1) and [1] style markers
  const regex = /[\[(](\d+)[\])]\s*([\s\S]*?)(?=[\[(]\d+[\])]|$)/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(passage)) !== null) {
    const text = m[2].replace(/\s+/g, ' ').trim();
    if (text) result[parseInt(m[1])] = text;
  }
  return result;
}

function langLabel(lang: string) {
  if (lang === "hebrew")  return "Biblical Hebrew";
  if (lang === "greek")   return "Koine Greek";
  if (lang === "aramaic") return "Biblical Aramaic";
  return lang;
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

function SidebarNav({ navLevel, navBook, selectedBook, selectedChapter, onGoTop, onGoBooks, onSelectBook, onSelectChapter }: {
  navLevel: NavLevel; navBook: BibleBook | null; selectedBook: string; selectedChapter: number;
  onGoTop: () => void; onGoBooks: () => void;
  onSelectBook: (b: BibleBook) => void; onSelectChapter: (b: BibleBook, ch: number) => void;
}) {
  if (navLevel === "top") {
    return (
      <div style={{ padding: "8px 0" }}>
        <SidebarItem icon="📖" label="Bible" onClick={onGoBooks} rightIcon={<ChevronRight size={13} style={{ color: "var(--muted-foreground)" }} />} />
      </div>
    );
  }

  if (navLevel === "books") {
    const ot = BIBLE_BOOKS.filter(b => b.testament === "OT");
    const nt = BIBLE_BOOKS.filter(b => b.testament === "NT");
    return (
      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <div style={{ padding: "8px 0 4px" }}>
          <button onClick={onGoTop} style={{ ...backBtnStyle, width: "100%" }}>
            <ChevronLeft size={13} /> Bible
          </button>
        </div>
        <div style={{ height: "1px", background: "var(--sidebar-border)", margin: "0 12px 4px" }} />
        <div style={{ overflowY: "auto", flex: 1 }}>
          <TestamentSection label="Old Testament" books={ot} selectedBook={selectedBook} onSelectBook={onSelectBook} />
          <TestamentSection label="New Testament" books={nt} selectedBook={selectedBook} onSelectBook={onSelectBook} />
        </div>
      </div>
    );
  }

  if (navLevel === "chapters" && navBook) {
    const chapters = Array.from({ length: navBook.chapters }, (_, i) => i + 1);
    return (
      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <div style={{ padding: "8px 0 4px" }}>
          <button onClick={onGoBooks} style={{ ...backBtnStyle, width: "100%" }}>
            <ChevronLeft size={13} /> Books
          </button>
        </div>
        <div style={{ padding: "6px 12px 2px", fontSize: "0.7rem", fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{navBook.name}</div>
        <div style={{ padding: "0 12px 6px", fontSize: "0.7rem", color: "var(--muted-foreground)" }}>{langLabel(navBook.language)}</div>
        <div style={{ height: "1px", background: "var(--sidebar-border)", margin: "0 12px 4px" }} />
        <div style={{ overflowY: "auto", flex: 1, padding: "4px 0" }}>
          {chapters.map(ch => {
            const sel = selectedBook === navBook.name && selectedChapter === ch;
            return (
              <button key={ch} onClick={() => onSelectChapter(navBook, ch)} style={{ width: "100%", textAlign: "left", padding: "4px 16px", border: "none", background: sel ? "var(--sidebar-accent)" : "transparent", cursor: "pointer", fontFamily: UI, fontSize: "0.875rem", color: sel ? "var(--foreground)" : "var(--muted-foreground)", fontWeight: sel ? 500 : 400 }}
                onMouseEnter={e => { if (!sel) e.currentTarget.style.background = "var(--sidebar-accent)"; }}
                onMouseLeave={e => { if (!sel) e.currentTarget.style.background = "transparent"; }}
              >Chapter {ch}</button>
            );
          })}
        </div>
      </div>
    );
  }

  return null;
}

function TestamentSection({ label, books, selectedBook, onSelectBook }: { label: string; books: BibleBook[]; selectedBook: string; onSelectBook: (b: BibleBook) => void }) {
  return (
    <div style={{ marginBottom: "8px" }}>
      <div style={{ padding: "8px 12px 4px", fontSize: "0.68rem", fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
      {books.map(b => {
        const active = b.name === selectedBook;
        return (
          <button key={b.name} onClick={() => onSelectBook(b)} style={{ width: "100%", textAlign: "left", padding: "4px 12px", border: "none", background: active ? "var(--sidebar-accent)" : "transparent", cursor: "pointer", fontFamily: UI, fontSize: "0.875rem", color: active ? "var(--foreground)" : "var(--sidebar-foreground)", fontWeight: active ? 500 : 400, display: "flex", justifyContent: "space-between", alignItems: "center" }}
            onMouseEnter={e => { if (!active) e.currentTarget.style.background = "var(--sidebar-accent)"; }}
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

function SidebarItem({ icon, label, onClick, rightIcon }: { icon: string; label: string; onClick: () => void; rightIcon?: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{ width: "100%", display: "flex", alignItems: "center", gap: "8px", padding: "4px 12px", border: "none", background: "transparent", cursor: "pointer", fontFamily: UI, fontSize: "0.875rem", color: "var(--sidebar-foreground)" }}
      onMouseEnter={e => e.currentTarget.style.background = "var(--sidebar-accent)"}
      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
    >
      <span>{icon}</span>
      <span style={{ flex: 1, textAlign: "left" }}>{label}</span>
      {rightIcon}
    </button>
  );
}

const backBtnStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: "4px", padding: "4px 12px", border: "none", background: "transparent", cursor: "pointer", fontFamily: UI, fontSize: "0.8rem", color: "var(--muted-foreground)" };
const iconBtn: React.CSSProperties = { padding: "4px 6px", borderRadius: "4px", background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" };

function NavBtn({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{ ...iconBtn, opacity: disabled ? 0.3 : 1, cursor: disabled ? "default" : "pointer", color: "var(--muted-foreground)" }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = "var(--muted)"; }}
      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
    >{children}</button>
  );
}

// ── Verse row ─────────────────────────────────────────────────────────────────

function VerseRow({ verse, isActive, selectedWord, commentaryCount, onToggle, onWordSelect }: {
  verse: ScriptureVerse; isActive: boolean; selectedWord: OriginalWord | null;
  commentaryCount: number; onToggle: () => void; onWordSelect: (w: OriginalWord) => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ borderRadius: "6px", background: isActive ? "var(--muted)" : hovered ? "var(--secondary)" : "transparent", transition: "background 0.08s", marginBottom: "2px" }}
    >
      <button onClick={onToggle} style={{ width: "100%", textAlign: "left", display: "flex", gap: "12px", padding: "6px 8px", border: "none", background: "transparent", cursor: "pointer", outline: "none", borderRadius: "6px" }}>
        <span style={{ fontFamily: MONO, fontSize: "0.72rem", color: "var(--muted-foreground)", minWidth: "24px", paddingTop: "5px", flexShrink: 0, userSelect: "none" }}>{verse.verse}</span>
        <span style={{ fontFamily: BODY, fontSize: "1rem", lineHeight: 1.85, color: "var(--foreground)", flex: 1 }}>{verse.text}</span>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "4px", paddingTop: "4px", flexShrink: 0, opacity: hovered || isActive ? 1 : 0, transition: "opacity 0.1s" }}>
          <Chip>Lexicon</Chip>
          {commentaryCount > 0 && <Chip>{commentaryCount} note{commentaryCount !== 1 ? "s" : ""}</Chip>}
        </div>
      </button>
      {isActive && (
        <div style={{ padding: "4px 8px 12px 44px" }}>
          <InterlinearStrip verse={verse} selectedWord={selectedWord} onWordSelect={onWordSelect} />
        </div>
      )}
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return <span style={{ fontFamily: UI, fontSize: "0.68rem", padding: "1px 6px", borderRadius: "4px", background: "var(--border)", color: "var(--muted-foreground)", whiteSpace: "nowrap" }}>{children}</span>;
}

// ── Interlinear strip ─────────────────────────────────────────────────────────

function InterlinearStrip({ verse, selectedWord, onWordSelect }: { verse: ScriptureVerse; selectedWord: OriginalWord | null; onWordSelect: (w: OriginalWord) => void }) {
  const isHebrew = verse.language === "hebrew";
  const origFont = isHebrew ? HE : GR;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 12px", direction: isHebrew ? "rtl" : "ltr", paddingTop: "8px" }}>
      {verse.words.map(word => {
        const sel = selectedWord?.id === word.id;
        return (
          <button key={word.id} onClick={() => onWordSelect(word)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", padding: "6px 8px", borderRadius: "6px", border: "none", cursor: "pointer", outline: "none", background: sel ? "var(--background)" : "transparent", boxShadow: sel ? "0 0 0 1px var(--border), 0 1px 3px rgba(0,0,0,0.06)" : "none" }}
            onMouseEnter={e => { if (!sel) e.currentTarget.style.background = "rgba(55,53,47,0.04)"; }}
            onMouseLeave={e => { if (!sel) e.currentTarget.style.background = "transparent"; }}
          >
            <span style={{ fontFamily: origFont, fontSize: isHebrew ? "1.2rem" : "1.1rem", lineHeight: 1.3, color: "var(--foreground)", direction: isHebrew ? "rtl" : "ltr" }}>{word.original}</span>
            <span style={{ fontFamily: MONO, fontSize: "0.58rem", color: "var(--muted-foreground)", direction: "ltr" }}>{word.transliteration}</span>
            <span style={{ fontFamily: UI, fontSize: "0.65rem", color: sel ? "var(--accent)" : "var(--muted-foreground)", direction: "ltr" }}>{word.gloss}</span>
          </button>
        );
      })}
    </div>
  );
}

// ── Detail panel ──────────────────────────────────────────────────────────────

function DetailPanel({ verse, commentaries, selectedWord, tab, onTabChange, onWordSelect, onClose, onNavigateTo }: {
  verse: ScriptureVerse; commentaries: Commentary[]; selectedWord: OriginalWord | null;
  tab: "lexicon" | "commentary" | "ai"; onTabChange: (t: "lexicon" | "commentary" | "ai") => void;
  onWordSelect: (w: OriginalWord) => void; onClose: () => void;
  onNavigateTo: (book: string, chapter: number, verse: number | null, pushHistory?: boolean) => void;
}) {
  const verseKey = `${verse.book} ${verse.chapter}:${verse.verse}`;
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "14px 16px 0", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
          <span style={{ fontFamily: UI, fontSize: "0.8rem", color: "var(--muted-foreground)" }}>{verseKey}</span>
          <button onClick={onClose} style={iconBtn}
            onMouseEnter={e => e.currentTarget.style.background = "var(--muted)"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          >
            <X size={14} style={{ color: "var(--muted-foreground)" }} />
          </button>
        </div>
        <div style={{ display: "flex", borderBottom: "1px solid var(--border)" }}>
          {([
            { key: "lexicon" as const,    icon: <FileText size={13} />,      label: "Lexicon" },
            { key: "commentary" as const, icon: <MessageSquare size={13} />, label: `Commentary${commentaries.length > 0 ? ` (${commentaries.length})` : ""}` },
            { key: "ai" as const,         icon: <Sparkles size={13} />,      label: "AI Study" },
          ]).map(t => (
            <button key={t.key} onClick={() => onTabChange(t.key)} style={{ display: "flex", alignItems: "center", gap: "5px", padding: "6px 10px", border: "none", background: "transparent", cursor: "pointer", fontFamily: UI, fontSize: "0.8rem", color: tab === t.key ? "var(--foreground)" : "var(--muted-foreground)", borderBottom: tab === t.key ? "2px solid var(--foreground)" : "2px solid transparent", marginBottom: "-1px" }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>
      {tab === "lexicon"    && <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}><LexiconTab verse={verse} selectedWord={selectedWord} onWordSelect={onWordSelect} onNavigateTo={onNavigateTo} /></div>}
      {tab === "commentary" && <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}><CommentaryTab commentaries={commentaries} verseKey={verseKey} /></div>}
      {tab === "ai"         && <AIStudyTab verse={verse} verseKey={verseKey} />}
    </div>
  );
}

// ── Lexicon tab ───────────────────────────────────────────────────────────────

function LexiconTab({ verse, selectedWord, onWordSelect, onNavigateTo }: {
  verse: ScriptureVerse; selectedWord: OriginalWord | null; onWordSelect: (w: OriginalWord) => void;
  onNavigateTo: (book: string, chapter: number, verse: number | null, pushHistory?: boolean) => void;
}) {
  const isHebrew = verse.language === "hebrew";
  const origFont = isHebrew ? HE : GR;

  const crossRefs = useMemo(() => {
    if (!selectedWord) return [];
    const results: { verse: ScriptureVerse; word: OriginalWord }[] = [];
    for (const v of PASSAGES) {
      if (v.book === verse.book && v.chapter === verse.chapter && v.verse === verse.verse) continue;
      for (const w of v.words) {
        if (w.strongsNumber === selectedWord.strongsNumber) {
          results.push({ verse: v, word: w });
          break;
        }
      }
    }
    return results;
  }, [selectedWord, verse]);

  if (!selectedWord) {
    return (
      <div>
        <p style={{ fontFamily: UI, fontSize: "0.85rem", color: "var(--muted-foreground)", marginBottom: "16px", lineHeight: 1.6 }}>Select a word to view its lexical entry.</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {verse.words.map(w => (
            <button key={w.id} onClick={() => onWordSelect(w)} style={{ fontFamily: origFont, fontSize: isHebrew ? "1.1rem" : "1rem", padding: "4px 10px", borderRadius: "6px", border: "1px solid var(--border)", background: "transparent", cursor: "pointer", color: "var(--foreground)" }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--muted)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >{w.original}</button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div style={{ padding: "16px", borderRadius: "8px", background: "var(--muted)" }}>
        <div style={{ fontFamily: origFont, fontSize: "2rem", lineHeight: 1.2, color: "var(--foreground)", marginBottom: "4px" }}>{selectedWord.original}</div>
        <div style={{ fontFamily: MONO, fontSize: "0.75rem", color: "var(--muted-foreground)", marginBottom: "6px" }}>{selectedWord.transliteration}</div>
        <div style={{ fontFamily: BODY, fontStyle: "italic", fontSize: "0.95rem", color: "var(--foreground)" }}>&ldquo;{selectedWord.gloss}&rdquo;</div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        {([["Strongs", selectedWord.strongsNumber], ["Lemma", selectedWord.lemma], ["Part of Speech", selectedWord.partOfSpeech], ["Parsing", selectedWord.parsing]] as [string, string][]).map(([label, value]) => (
          <div key={label} style={{ display: "flex", alignItems: "baseline", gap: "8px", padding: "4px 0", borderBottom: "1px solid var(--border)" }}>
            <span style={{ fontFamily: UI, fontSize: "0.8rem", color: "var(--muted-foreground)", minWidth: "110px", flexShrink: 0 }}>{label}</span>
            <span style={{ fontFamily: MONO, fontSize: "0.8rem", color: "var(--foreground)" }}>{value}</span>
          </div>
        ))}
      </div>

      <div style={{ borderLeft: "3px solid var(--border)", paddingLeft: "12px" }}>
        <div style={{ fontFamily: UI, fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted-foreground)", marginBottom: "6px" }}>Lexical Notes</div>
        <p style={{ fontFamily: BODY, fontSize: "0.9rem", lineHeight: 1.8, color: "var(--foreground)", margin: 0 }}>{selectedWord.extendedDefinition}</p>
      </div>

      <div>
        <div style={{ fontFamily: UI, fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted-foreground)", marginBottom: "8px" }}>
          Used elsewhere in Scripture
        </div>
        {crossRefs.length === 0 ? (
          <p style={{ fontFamily: UI, fontSize: "0.82rem", color: "var(--muted-foreground)", fontStyle: "italic" }}>
            No other indexed occurrences of {selectedWord.strongsNumber}.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {crossRefs.map(({ verse: refVerse, word: refWord }) => (
              <button
                key={`${refVerse.book}-${refVerse.chapter}-${refVerse.verse}`}
                onClick={() => onNavigateTo(refVerse.book, refVerse.chapter, refVerse.verse)}
                style={{ textAlign: "left", padding: "10px 12px", borderRadius: "6px", border: "1px solid var(--border)", background: "transparent", cursor: "pointer", display: "flex", flexDirection: "column", gap: "4px" }}
                onMouseEnter={e => e.currentTarget.style.background = "var(--muted)"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                  <span style={{ fontFamily: MONO, fontSize: "0.72rem", color: "var(--accent)", fontWeight: 500 }}>
                    {refVerse.book} {refVerse.chapter}:{refVerse.verse}
                  </span>
                  <span style={{ fontFamily: origFont, fontSize: isHebrew ? "1rem" : "0.9rem", color: "var(--muted-foreground)" }}>
                    {refWord.original}
                  </span>
                </div>
                <p style={{ fontFamily: BODY, fontSize: "0.82rem", lineHeight: 1.65, color: "var(--muted-foreground)", margin: 0 }}>
                  {refVerse.text}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <div style={{ fontFamily: UI, fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted-foreground)", marginBottom: "8px" }}>Other words in this verse</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
          {verse.words.filter(w => w.id !== selectedWord.id).map(w => (
            <button key={w.id} onClick={() => onWordSelect(w)} style={{ fontFamily: origFont, fontSize: isHebrew ? "0.95rem" : "0.9rem", padding: "3px 8px", borderRadius: "4px", border: "1px solid var(--border)", background: "transparent", cursor: "pointer", color: "var(--muted-foreground)" }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--muted)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >{w.original}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Commentary tab ────────────────────────────────────────────────────────────

function CommentaryTab({ commentaries, verseKey }: { commentaries: Commentary[]; verseKey: string }) {
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
          {commentaries.map((c, i) => (
            <article key={c.id} style={{ paddingBottom: "20px", marginBottom: "20px", borderBottom: i < commentaries.length - 1 ? "1px solid var(--border)" : "none" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginBottom: "4px" }}>
                <span style={{ fontFamily: UI, fontSize: "0.875rem", fontWeight: 600, color: "var(--foreground)" }}>{c.author}</span>
                <span style={{ fontFamily: UI, fontSize: "0.75rem", color: "var(--muted-foreground)" }}>{c.era}</span>
              </div>
              <div style={{ fontFamily: UI, fontSize: "0.72rem", color: "var(--muted-foreground)", marginBottom: "10px" }}>{c.source}</div>
              <blockquote style={{ fontFamily: BODY, fontSize: "0.9rem", lineHeight: 1.8, fontStyle: "italic", color: "var(--foreground)", margin: 0, paddingLeft: "12px", borderLeft: "2px solid var(--border)" }}>
                &ldquo;{c.text}&rdquo;
              </blockquote>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

// ── AI Study tab ──────────────────────────────────────────────────────────────

interface ChatMessage { role: "user" | "assistant"; content: string }

const SUGGESTED_PROMPTS = [
  "Give me a brief overview of this passage.",
  "What are the key theological themes here?",
  "Explain the historical and cultural context.",
  "What does this passage teach about God's character?",
]

function AIStudyTab({ verse, verseKey }: { verse: ScriptureVerse; verseKey: string }) {
  const [messages,  setMessages]  = useState<ChatMessage[]>([]);
  const [input,     setInput]     = useState("");
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);

  // Reset conversation when the verse changes
  const prevVerseKey = useRef(verseKey);
  if (prevVerseKey.current !== verseKey) {
    prevVerseKey.current = verseKey;
    // Can't call setMessages directly during render, use an effect below
  }
  useEffect(() => {
    setMessages([]);
    setInput("");
    setError("");
  }, [verseKey]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setInput("");
    setError("");
    const userMsg: ChatMessage = { role: "user", content: trimmed };
    const next = [...messages, userMsg];
    setMessages(next);
    setLoading(true);
    try {
      const res = await fetch("/api/study", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ passage: verseKey, messages: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed.");
      setMessages(prev => [...prev, { role: "assistant", content: data.result }]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Request failed.");
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  const empty = messages.length === 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, height: "100%", overflow: "hidden" }}>
      {/* Messages area */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "16px" }}>
        {empty && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <p style={{ fontFamily: UI, fontSize: "0.85rem", color: "var(--muted-foreground)", lineHeight: 1.6, margin: 0 }}>
              Ask anything about <strong style={{ color: "var(--foreground)" }}>{verseKey}</strong> — context, themes, language, theology.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {SUGGESTED_PROMPTS.map(p => (
                <button key={p} onClick={() => send(p)}
                  style={{ textAlign: "left", padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--border)", background: "transparent", cursor: "pointer", fontFamily: UI, fontSize: "0.8rem", color: "var(--muted-foreground)", lineHeight: 1.5 }}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--muted)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >{p}</button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", gap: "2px", alignItems: m.role === "user" ? "flex-end" : "flex-start" }}>
            <span style={{ fontFamily: UI, fontSize: "0.68rem", color: "var(--muted-foreground)", marginBottom: "2px" }}>
              {m.role === "user" ? "You" : "AI Study"}
            </span>
            <div style={{
              maxWidth: "90%",
              padding: "10px 13px",
              borderRadius: m.role === "user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
              background: m.role === "user" ? "var(--foreground)" : "var(--muted)",
              color:      m.role === "user" ? "var(--background)" : "var(--foreground)",
              fontFamily: BODY,
              fontSize:   "0.875rem",
              lineHeight: 1.75,
              whiteSpace: "pre-wrap",
            }}>
              {m.role === "assistant" ? <MarkdownText text={m.content} /> : m.content}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontFamily: UI, fontSize: "0.68rem", color: "var(--muted-foreground)" }}>AI Study</span>
            <div style={{ display: "flex", gap: "3px", paddingLeft: "4px" }}>
              {[0,1,2].map(i => (
                <span key={i} style={{ width: "5px", height: "5px", borderRadius: "50%", background: "var(--muted-foreground)", opacity: 0.5, animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />
              ))}
            </div>
          </div>
        )}

        {error && (
          <p style={{ fontFamily: UI, fontSize: "0.8rem", color: "var(--destructive)", margin: 0 }}>{error}</p>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: "8px", padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--background)" }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => { setInput(e.target.value); e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px"; }}
            onKeyDown={handleKey}
            placeholder={`Ask about ${verseKey}…`}
            rows={1}
            style={{ flex: 1, resize: "none", border: "none", outline: "none", background: "transparent", fontFamily: UI, fontSize: "0.875rem", color: "var(--foreground)", lineHeight: 1.5, maxHeight: "120px", overflow: "auto" }}
          />
          <button
            onClick={() => send(input)}
            disabled={!input.trim() || loading}
            style={{ flexShrink: 0, padding: "6px", borderRadius: "6px", border: "none", background: input.trim() && !loading ? "var(--foreground)" : "transparent", cursor: input.trim() && !loading ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.15s" }}
          >
            <Send size={14} style={{ color: input.trim() && !loading ? "var(--background)" : "var(--muted-foreground)" }} />
          </button>
        </div>
        <p style={{ fontFamily: UI, fontSize: "0.68rem", color: "var(--muted-foreground)", margin: "6px 0 0", textAlign: "center" }}>
          Shift+Enter for new line · Enter to send · 20 messages/hr
        </p>
      </div>
    </div>
  );
}
