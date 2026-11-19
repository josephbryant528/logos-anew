'use client'

import { useState, useMemo, useEffect, useCallback, useRef, useSyncExternalStore } from "react";
import {
  PASSAGES, BIBLE_BOOKS, BibleBook, OriginalWord, ScriptureVerse, VerseLayout,
  getCommentariesForVerse, Commentary
} from "./data/scripture";
import {
  ChevronLeft, ChevronRight, X, Moon, Sun,
  FileText, MessageSquare, BookOpen, ArrowLeft, Sparkles, Send,
} from "lucide-react";

const UI   = "'Inter', system-ui, sans-serif";
const BODY = "'Lora', serif";
const MONO = "'DM Mono', monospace";
const HE   = "'Noto Serif Hebrew', 'Noto Serif', serif";
const GR   = "'Noto Serif', serif";

// Top bar height. Phone controls are at least 44px so they are easy to tap.
const HEADER_H = 48;
// Tapping Aa steps through these; the choice is remembered on this device.
const TEXT_SIZES = [{ name: "Medium", scale: 1 }, { name: "Large", scale: 1.15 }, { name: "Extra large", scale: 1.3 }, { name: "Small", scale: 0.9 }];
const TAP = 44;

type NavLevel = "top" | "books" | "chapters";
type AppMode  = "bible" | "disciplines" | "prayer";

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

// True on phone-sized screens. Starts false so the server and first client render match.
const MOBILE_QUERY = "(max-width: 768px)";
function subscribeMobile(onChange: () => void) {
  const mq = window.matchMedia(MOBILE_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}
function useIsMobile() {
  return useSyncExternalStore(
    subscribeMobile,
    () => window.matchMedia(MOBILE_QUERY).matches,
    () => false,
  );
}

export default function App() {
  const isMobile = useIsMobile();
  const [navLevel, setNavLevel] = useState<NavLevel>("books");
  const [navBook,  setNavBook]  = useState<BibleBook | null>(null);

  const [selectedBook,    setSelectedBook]    = useState("John");
  const [selectedChapter, setSelectedChapter] = useState(1);
  const [activeVerse,     setActiveVerse]     = useState<ScriptureVerse | null>(null);
  const [selectedWord,    setSelectedWord]    = useState<OriginalWord | null>(null);
  const [detailTab,       setDetailTab]       = useState<"lexicon" | "commentary" | "ai">("lexicon");

  const [history, setHistory] = useState<Location[]>([]);
  const appMode = "bible" as AppMode; // Disciplines and Prayer Log are hidden for now
  const [darkMode,       setDarkMode]       = useState(false);
  const [sidebarOpen,    setSidebarOpen]    = useState(true);
  const [dynamicVerses,  setDynamicVerses]  = useState<ScriptureVerse[]>([]);
  const [versesLoading,  setVersesLoading]  = useState(false);
  const [versesError,    setVersesError]    = useState<string | null>(null);
  const chapterCache     = useRef<Map<string, ScriptureVerse[]>>(new Map());
  const [textScale, setTextScale] = useState<number>(1);
  const [sizeToast, setSizeToast] = useState<string | null>(null);
  const sizeToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    // Read the saved size after hydration so server and client markup match.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    try { const v = parseFloat(localStorage.getItem("unveiled.textScale") ?? ""); if (TEXT_SIZES.some(t => t.scale === v)) setTextScale(v); } catch {}
  }, []);
  useEffect(() => {
    document.documentElement.style.setProperty("--verse-scale", String(textScale));
    try { localStorage.setItem("unveiled.textScale", String(textScale)); } catch {}
  }, [textScale]);
  const textSizeName = (TEXT_SIZES.find(t => t.scale === textScale) ?? TEXT_SIZES[0]).name;
  const cycleTextSize = () => {
    const i = TEXT_SIZES.findIndex(t => t.scale === textScale);
    const next = TEXT_SIZES[(i + 1) % TEXT_SIZES.length];
    setTextScale(next.scale);
    setSizeToast(`Text size: ${next.name}`);
    if (sizeToastTimer.current) clearTimeout(sizeToastTimer.current);
    sizeToastTimer.current = setTimeout(() => setSizeToast(null), 1400);
  };
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
      const layouts = parseEsvLayout(esvData?.passage ?? '');
      // With headings on, the plain splitter would glue a heading onto the verse before it; take each verse's text from the layout instead.
      for (const [n, l] of Object.entries(layouts)) verseTexts[Number(n)] = l.lines.filter(x => x.indent >= 0).map(x => x.text).join(' ');
      const lexVerses: ScriptureVerse[] = lexData?.verses ?? [];
      const bookMeta = BIBLE_BOOKS.find(b => b.name === book);
      const language = (bookMeta?.language ?? 'greek') as ScriptureVerse['language'];

      let result: ScriptureVerse[] = [];

      if (lexVerses.length > 0) {
        lexVerses.forEach(v => { v.text = verseTexts[v.verse] ?? ''; v.layout = layouts[v.verse]; v.translation = 'ESV'; v.words = (v.words ?? []).map(cleanWord); });
        const interlinearNums = new Set(lexVerses.map(v => v.verse));
        const textOnlyVerses: ScriptureVerse[] = Object.entries(verseTexts)
          .filter(([n]) => !interlinearNums.has(parseInt(n)))
          .map(([n, text]) => ({ book, chapter, verse: parseInt(n), language, text, layout: layouts[parseInt(n)], translation: 'ESV', words: [] }));
        result = [...lexVerses, ...textOnlyVerses].sort((a, b) => a.verse - b.verse);
      } else if (Object.keys(verseTexts).length > 0) {
        result = Object.entries(verseTexts)
          .map(([n, text]) => ({ book, chapter, verse: parseInt(n), language, text, layout: layouts[parseInt(n)], translation: 'ESV', words: [] }))
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

  // On a phone the book list starts hidden and opens as a slide-over menu.
  const [drawerOpen, setDrawerOpen] = useState(false);
  const showSidebar = isMobile ? drawerOpen : sidebarOpen;
  const closeDrawerOnMobile = () => { if (isMobile) setDrawerOpen(false); };

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

  // The chapter before and after this one, crossing into the neighbouring book
  // at either end (Genesis 1 has no previous, Revelation 22 no next).
  const bookIndex = BIBLE_BOOKS.findIndex(b => b.name === selectedBook);
  const prevLoc = selectedChapter > 1
    ? { book: selectedBook, chapter: selectedChapter - 1 }
    : bookIndex > 0 ? { book: BIBLE_BOOKS[bookIndex - 1].name, chapter: BIBLE_BOOKS[bookIndex - 1].chapters } : null;
  const nextLoc = selectedChapter < (currentBookMeta?.chapters ?? 1)
    ? { book: selectedBook, chapter: selectedChapter + 1 }
    : bookIndex >= 0 && bookIndex < BIBLE_BOOKS.length - 1 ? { book: BIBLE_BOOKS[bookIndex + 1].name, chapter: 1 } : null;
  const goToChapter = (loc: { book: string; chapter: number } | null) => {
    if (!loc) return;
    setSelectedBook(loc.book);
    setSelectedChapter(loc.chapter);
    setActiveVerse(null);
    setSelectedWord(null);
  };
  const chapterLabel = (loc: { book: string; chapter: number }) =>
    loc.book === selectedBook ? `Chapter ${loc.chapter}` : `${loc.book} ${loc.chapter}`;

  // Start each chapter at the top.
  const mainRef = useRef<HTMLElement>(null);
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [selectedBook, selectedChapter]);

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

  // On a phone the study panel is a bottom sheet: half height so the verse
  // stays in view above it, or full height when pulled up.
  const [sheetFull, setSheetFull] = useState(false);
  const closeStudy = () => { setActiveVerse(null); setSelectedWord(null); setSheetFull(false); };
  useEffect(() => {
    if (!isMobile || !activeVerse) return;
    const main = mainRef.current;
    const el = main?.querySelector<HTMLElement>(`[data-verse="${activeVerse.verse}"]`);
    if (!main || !el) return;
    const top = el.getBoundingClientRect().top - main.getBoundingClientRect().top + main.scrollTop - 8;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    main.scrollTo({ top: Math.max(0, top), behavior: reduce ? "auto" : "smooth" });
  }, [activeVerse, isMobile]);

  const handleSelectChapter = (book: BibleBook, ch: number) => {
    setSelectedBook(book.name);
    setSelectedChapter(ch);
    setActiveVerse(null);
    setSelectedWord(null);
    setHistory([]);
    closeDrawerOnMobile();
  };

  return (
    <div className={darkMode ? "dark" : ""} style={{ height: "100dvh", display: "flex", flexDirection: "column", background: "var(--background)", color: "var(--foreground)", fontFamily: UI, paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}>

      {/* Topbar */}
      <header style={{ height: `${HEADER_H}px`, display: "flex", alignItems: "center", gap: isMobile ? "2px" : "8px", padding: isMobile ? "0 4px" : "0 12px", borderBottom: "1px solid var(--border)", background: "var(--background)", flexShrink: 0 }}>
        <button style={iconBtn} aria-label="Books and menu" onClick={() => isMobile ? setDrawerOpen(o => !o) : setSidebarOpen(o => !o)}
          onMouseEnter={e => { if (canHover()) e.currentTarget.style.background = "var(--muted)"; }}
          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
        >
          <BookOpen size={18} style={{ color: "var(--muted-foreground)" }} />
        </button>

        {history.length > 0 && (
          <button style={{ ...iconBtn, gap: "4px", fontSize: "0.8rem", color: "var(--muted-foreground)" }} onClick={navigateBack}
            onMouseEnter={e => { if (canHover()) e.currentTarget.style.background = "var(--muted)"; }}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            <ArrowLeft size={14} />
            <span>Back</span>
          </button>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: "4px", flex: 1, minWidth: 0, fontSize: "0.875rem", whiteSpace: "nowrap", overflow: "hidden" }}>
          {!isMobile && (
            <>
              <span style={{ color: "var(--muted-foreground)" }}>Unveiled</span>
              <span style={{ color: "var(--border)" }}>/</span>
            </>
          )}
          <span style={{ color: "var(--foreground)", fontWeight: 500 }}>{selectedBook}</span>
          <span style={{ color: "var(--border)" }}>/</span>
          <span style={{ color: "var(--foreground)", fontWeight: 500 }}>{isMobile ? selectedChapter : `Chapter ${selectedChapter}`}</span>
        </div>

        {appMode === "bible" && (
          <>
            <NavBtn label="Previous chapter" onClick={() => goToChapter(prevLoc)} disabled={!prevLoc}>
              <ChevronLeft size={18} />
            </NavBtn>
            <NavBtn label="Next chapter" onClick={() => goToChapter(nextLoc)} disabled={!nextLoc}>
              <ChevronRight size={18} />
            </NavBtn>
          </>
        )}
        <NavBtn label={`Text size: ${textSizeName}`} onClick={cycleTextSize}>
          <span aria-hidden="true" style={{ fontFamily: BODY, fontSize: "1rem", color: "var(--muted-foreground)", lineHeight: 1 }}>A<span style={{ fontSize: "0.75em" }}>a</span></span>
        </NavBtn>
        <NavBtn label={darkMode ? "Light mode" : "Dark mode"} onClick={() => setDarkMode(d => !d)}>
          {darkMode ? <Sun size={17} style={{ color: "var(--muted-foreground)" }} /> : <Moon size={17} style={{ color: "var(--muted-foreground)" }} />}
        </NavBtn>
      </header>
      {sizeToast && (
        <div role="status" style={{ position: "fixed", top: 60, left: "50%", transform: "translateX(-50%)", zIndex: 60, padding: "6px 14px", borderRadius: 999, background: "var(--foreground)", color: "var(--background)", fontSize: "0.8rem", fontWeight: 500, pointerEvents: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>{sizeToast}</div>
      )}

      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>

        {/* Sidebar */}
        {showSidebar && isMobile && (
          <div onClick={() => setDrawerOpen(false)} aria-hidden
            style={{ position: "fixed", inset: 0, top: `calc(${HEADER_H}px + env(safe-area-inset-top))`, background: "rgba(0,0,0,0.3)", zIndex: 39 }} />
        )}
        {showSidebar && (
          <aside style={isMobile
            ? { position: "fixed", top: `calc(${HEADER_H}px + env(safe-area-inset-top))`, left: 0, bottom: 0, width: "min(85vw, 300px)", zIndex: 40, background: "var(--sidebar)", borderRight: "1px solid var(--sidebar-border)", display: "flex", flexDirection: "column", overflowY: "auto", boxShadow: "2px 0 12px rgba(0,0,0,0.12)", paddingBottom: "env(safe-area-inset-bottom)" }
            : { width: "240px", flexShrink: 0, background: "var(--sidebar)", borderRight: "1px solid var(--sidebar-border)", display: "flex", flexDirection: "column", overflowY: "auto" }}>
            {appMode === "bible" && (
              <SidebarNav
                touch={isMobile}
                navLevel={navLevel}
                navBook={navBook}
                selectedBook={selectedBook}
                selectedChapter={selectedChapter}
                onGoTop={() => setNavLevel("top")}
                onGoBooks={() => setNavLevel("books")}
                onSelectBook={(b) => { setNavBook(b); setNavLevel("chapters"); }}
                onSelectChapter={handleSelectChapter}
              />
            )}
          </aside>
        )}

        {/* Main content area */}
        {/* Main reading pane */}
        <main ref={mainRef} style={{ flex: 1, overflowY: "auto", display: appMode === "bible" ? "block" : "none" }}>
          {/* Tinted header band */}
          <div style={{ background: "rgba(46,170,220,0.05)", borderBottom: "1px solid rgba(46,170,220,0.1)", padding: isMobile ? "16px 16px 12px" : "48px 64px 36px" }}>
            <div style={{ maxWidth: "820px" }}>
              {currentBookMeta && (
                <div style={{ fontFamily: MONO, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--accent-text)", marginBottom: "10px" }}>
                  {currentBookMeta.testament === "OT" ? "Old Testament" : "New Testament"} · {langLabel(currentBookMeta.language)}
                </div>
              )}
              <h1 style={{ fontFamily: UI, fontSize: isMobile ? "1.4rem" : "2rem", fontWeight: 700, color: "var(--foreground)", marginBottom: "6px", lineHeight: 1.2 }}>
                {selectedBook}
              </h1>
              <p style={{ fontFamily: UI, fontSize: "0.875rem", color: "var(--muted-foreground)", margin: 0 }}>
                Chapter {selectedChapter} · ESV
              </p>
            </div>
          </div>
          <div style={{ maxWidth: "820px", margin: "0 auto", padding: isMobile ? `16px 8px ${activeVerse ? "calc(55dvh + 24px)" : "96px"}` : "40px 64px 120px" }}>

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
                    compact={isMobile}
                    verse={verse}
                    isActive={activeVerse?.verse === verse.verse}
                    selectedWord={selectedWord}
                    commentaryCount={getCommentariesForVerse(verse.book, verse.chapter, verse.verse).length}
                    onToggle={() => handleVerseClick(verse)}
                    onWordSelect={(w) => setSelectedWord(prev => prev?.id === w.id ? null : w)}
                  />
                ))}
                <nav aria-label="Chapters" style={{ display: "flex", gap: "8px", marginTop: "32px", padding: isMobile ? "0 8px" : 0 }}>
                  {prevLoc && (
                    <button onClick={() => goToChapter(prevLoc)} style={chapterStepBtn}>
                      <ChevronLeft size={16} style={{ flexShrink: 0 }} /><span>{chapterLabel(prevLoc)}</span>
                    </button>
                  )}
                  {nextLoc && (
                    <button onClick={() => goToChapter(nextLoc)} style={{ ...chapterStepBtn, justifyContent: "flex-end", marginLeft: "auto", textAlign: "right" }}>
                      <span>{chapterLabel(nextLoc)}</span><ChevronRight size={16} style={{ flexShrink: 0 }} />
                    </button>
                  )}
                </nav>
                <EsvNotice padded={isMobile} />
              </div>
            )}
          </div>
        </main>

        {/* Detail panel */}
        {appMode === "bible" && activeVerse && (
          <aside aria-label="Study panel" style={isMobile
            ? { position: "fixed", left: 0, right: 0, bottom: 0, height: sheetFull ? `calc(100dvh - ${HEADER_H}px - env(safe-area-inset-top))` : "55dvh", zIndex: 50, background: "var(--background)", display: "flex", flexDirection: "column", paddingBottom: "env(safe-area-inset-bottom)", borderTop: "1px solid var(--border)", borderRadius: sheetFull ? 0 : "14px 14px 0 0", boxShadow: "0 -8px 24px rgba(0,0,0,0.12)", transition: "height 0.2s ease, border-radius 0.2s ease" }
            : { width: "380px", flexShrink: 0, borderLeft: "1px solid var(--border)", background: "var(--background)", display: "flex", flexDirection: "column" }}>
            <DetailPanel
              verse={activeVerse}
              commentaries={commentaries}
              selectedWord={selectedWord}
              tab={detailTab}
              onTabChange={setDetailTab}
              onWordSelect={(w) => setSelectedWord(prev => prev?.id === w.id ? null : w)}
              onClose={closeStudy}
              sheet={isMobile ? { full: sheetFull, onExpand: () => setSheetFull(true), onShrink: () => setSheetFull(false), onDismiss: closeStudy } : undefined}
              onNavigateTo={navigateTo}
              onCrossRefNavigate={(book, chapter, verse) => { navigateTo(book, chapter, verse); setDetailTab("lexicon"); }}
            />
          </aside>
        )}
      </div>
    </div>
  );
}

// The lexicon data marks morpheme breaks ("/", "\\"), syllables (".") and
// cantillation; strip those so words read cleanly on screen.
function cleanOriginal(text: string) {
  return text
    .replace(/[\u0591-\u05AF\u05BD]/g, "") // Hebrew cantillation accents and meteg
    .replace(/[\/\\\u05C3\u05BE:]/g, "") // morpheme breaks, sof pasuq, maqaf
    .replace(/[\u00B6\u00A7]/g, "") // paragraph marks from the source text
    .trim();
}
function cleanTransliteration(text: string) {
  return text.replace(/[\/\\.]/g, "").replace(/-+$/, "").toLowerCase().trim();
}
function cleanGloss(text: string) {
  const withoutUntranslated = text.replace(/<[^>]*>/g, "").replace(/[\[\]]/g, "").replace(/\s+/g, " ").trim();
  if (withoutUntranslated) return withoutUntranslated;
  const inner = text.replace(/[<>\[\]]/g, "").trim();
  return inner === "obj." ? "(object marker)" : inner;
}
function cleanWord(w: OriginalWord): OriginalWord {
  return { ...w, original: cleanOriginal(w.original), transliteration: cleanTransliteration(w.transliteration), gloss: cleanGloss(w.gloss) };
}

// The ESV plain-text format carries the page layout in its whitespace:
//   "\n\n  [9] ..."         a prose paragraph starts (indent 2, or 6 after poetry)
//   "\n    line" / 8 spaces  a poetry line, at indent level 0 / 1
//   "\n    \n    \n"       a stanza break
//   an unindented line with no verse number is a section heading (or a psalm title)
function parseEsvLayout(passage: string): Record<number, VerseLayout> {
  const out: Record<number, VerseLayout> = {};
  let current: VerseLayout | null = null;
  let pendingHeading: string[] = [];
  let pendingPara = true;
  let blankRun = 0;
  const marker = /[\[(](\d+)[\])]/g;

  for (const raw of passage.split("\n")) {
    if (raw.trim() === "") { blankRun++; continue; }
    const ind = raw.length - raw.trimStart().length;
    const body = raw.trim();
    const hasMarker = /[\[(]\d+[\])]/.test(body);
    if (ind === 0 && !hasMarker && blankRun > 0 || ind === 0 && !hasMarker && current === null) {
      pendingHeading.push(body);
      pendingPara = true;
      blankRun = 0;
      continue;
    }
    const poetry = ind >= 4 && ind % 4 === 0;
    const level = poetry ? Math.max(0, ind / 4 - 1) : 0;
    const stanza = blankRun >= 2;
    if (!poetry && (blankRun > 0 || ind % 4 === 2)) pendingPara = true;
    blankRun = 0;

    // Split the line at verse numbers; text before the first number continues the current verse.
    let last = 0; let m: RegExpExecArray | null; const pieces: { n: number | null; text: string }[] = [];
    marker.lastIndex = 0;
    let n: number | null = null;
    while ((m = marker.exec(body)) !== null) {
      pieces.push({ n, text: body.slice(last, m.index) });
      n = parseInt(m[1]); last = m.index + m[0].length;
    }
    pieces.push({ n, text: body.slice(last) });

    pieces.forEach((p, i) => {
      const text = p.text.replace(/\s+/g, " ").trim();
      if (p.n !== null) {
        current = {
          lines: [], poetry, paraStart: pendingPara, stanzaBreak: stanza && i === 1,
          heading: pendingHeading.length ? pendingHeading.join(" · ") : undefined,
        };
        out[p.n] = current;
        pendingHeading = []; pendingPara = false;
      }
      if (!current || !text) return;
      if (poetry) {
        current.poetry = true;
        if (stanza && i === 0 && current.lines.length) current.lines.push({ text: "", indent: -1 });
        // A poetry line split by a verse number is one printed line: the continuation keeps no new indent.
        current.lines.push({ text, indent: i === 0 ? level : (i === 1 ? level : 0) });
      } else {
        const prev = current.lines[current.lines.length - 1];
        if (prev && !current.poetry) prev.text += " " + text;
        else current.lines.push({ text, indent: 0 });
      }
    });
  }
  return out;
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

function SidebarNav({ touch, navLevel, navBook, selectedBook, selectedChapter, onGoTop, onGoBooks, onSelectBook, onSelectChapter }: {
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

function TestamentSection({ touch, label, books, selectedBook, onSelectBook }: { touch: boolean; label: string; books: BibleBook[]; selectedBook: string; onSelectBook: (b: BibleBook) => void }) {
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

function SidebarItem({ icon, label, onClick, rightIcon, active, indent }: { icon: React.ReactNode; label: string; onClick: () => void; rightIcon?: React.ReactNode; active?: boolean; indent?: boolean }) {
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

// Touch screens fire mouseenter on tap and never fire mouseleave, which leaves hover colours stuck.
const canHover = () => typeof window !== "undefined" && window.matchMedia("(hover: hover)").matches;

// Crossway requires this notice, the letters "ESV" and a link to esv.org on every page that shows ESV text.
function EsvNotice({ padded }: { padded: boolean }) {
  return (
    <footer style={{ marginTop: "40px", padding: padded ? "16px 8px 0" : "16px 0 0", borderTop: "1px solid var(--border)", fontFamily: UI, fontSize: "0.75rem", lineHeight: 1.6, color: "var(--muted-foreground)" }}>
      <p style={{ margin: 0 }}>
        Scripture quotations are from the ESV® Bible (The Holy Bible, English Standard Version®), © 2001 by Crossway, a publishing ministry of Good News Publishers. ESV Text Edition: 2025. The ESV text may not be quoted in any publication made available to the public by a Creative Commons license. The ESV may not be translated in whole or in part into any other language. Used by permission. All rights reserved.
      </p>
      <p style={{ margin: "8px 0 0" }}>
        <a href="https://www.esv.org" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent-text)", textDecoration: "underline", textUnderlineOffset: "2px", display: "inline-block", padding: "12px 0" }}>Read the ESV at esv.org</a>
      </p>
    </footer>
  );
}

const chapterStepBtn: React.CSSProperties = { flex: 1, maxWidth: "50%", minHeight: `${TAP}px`, display: "flex", alignItems: "center", gap: "6px", padding: "10px 14px", borderRadius: "8px", border: "1px solid var(--border)", background: "transparent", cursor: "pointer", fontFamily: UI, fontSize: "0.875rem", color: "var(--foreground)" };
const backBtnStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: "4px", padding: "4px 12px", border: "none", background: "transparent", cursor: "pointer", fontFamily: UI, fontSize: "0.8rem", color: "var(--muted-foreground)" };
const iconBtn: React.CSSProperties = { minWidth: `${TAP}px`, minHeight: `${TAP}px`, padding: "0 10px", borderRadius: "8px", background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px", flexShrink: 0 };

function NavBtn({ onClick, disabled, label, children }: { onClick: () => void; disabled?: boolean; label: string; children: React.ReactNode }) {
  return (
    <button onClick={onClick} disabled={disabled} aria-label={label} title={label} style={{ ...iconBtn, opacity: disabled ? 0.3 : 1, cursor: disabled ? "default" : "pointer", color: "var(--muted-foreground)" }}
      onMouseEnter={e => { if (!canHover()) return; if (!disabled) e.currentTarget.style.background = "var(--muted)"; }}
      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
    >{children}</button>
  );
}

// ── Verse row ─────────────────────────────────────────────────────────────────

function VerseRow({ verse, compact, isActive, selectedWord, commentaryCount, onToggle, onWordSelect }: {
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

function Chip({ children }: { children: React.ReactNode }) {
  return <span style={{ fontFamily: UI, fontSize: "0.75rem", padding: "1px 6px", borderRadius: "4px", background: "var(--border)", color: "var(--muted-foreground)", whiteSpace: "nowrap" }}>{children}</span>;
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
          <button key={word.id} onClick={() => onWordSelect(word)} aria-pressed={sel} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", minWidth: `${TAP}px`, padding: "6px 8px", borderRadius: "6px", border: "none", cursor: "pointer", background: sel ? "var(--background)" : "transparent", boxShadow: sel ? "0 0 0 1px var(--border), 0 1px 3px rgba(0,0,0,0.06)" : "none" }}
            onMouseEnter={e => { if (!canHover()) return; if (!sel) e.currentTarget.style.background = "rgba(55,53,47,0.04)"; }}
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

// ── Detail panel ──────────────────────────────────────────────────────────────

interface SheetControls { full: boolean; onExpand: () => void; onShrink: () => void; onDismiss: () => void }

// Grab handle on the phone's bottom sheet: tap to expand or shrink, swipe up
// to expand, swipe down to shrink and then close.
function SheetHandle({ sheet }: { sheet: SheetControls }) {
  const startY = useRef<number | null>(null);
  const swiped = useRef(false);
  return (
    <button
      aria-label={sheet.full ? "Shrink study panel" : "Expand study panel"}
      aria-expanded={sheet.full}
      onPointerDown={e => { startY.current = e.clientY; swiped.current = false; }}
      onPointerUp={e => {
        if (startY.current === null) return;
        const dy = e.clientY - startY.current;
        startY.current = null;
        if (dy > 40) { swiped.current = true; if (sheet.full) sheet.onShrink(); else sheet.onDismiss(); }
        else if (dy < -40) { swiped.current = true; sheet.onExpand(); }
      }}
      onClick={() => { if (swiped.current) { swiped.current = false; return; } if (sheet.full) sheet.onShrink(); else sheet.onExpand(); }}
      style={{ display: "flex", justifyContent: "center", alignItems: "center", width: "100%", height: "24px", border: "none", background: "transparent", cursor: "grab", touchAction: "none", flexShrink: 0 }}
    >
      <span aria-hidden="true" style={{ width: "36px", height: "4px", borderRadius: "2px", background: "var(--muted-foreground)", opacity: 0.4 }} />
    </button>
  );
}

function DetailPanel({ verse, commentaries, selectedWord, tab, onTabChange, onWordSelect, onClose, sheet, onNavigateTo, onCrossRefNavigate }: {
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
          <button onClick={onClose} aria-label="Close study panel" style={{ ...iconBtn, margin: "-12px -12px -12px 0" }}
            onMouseEnter={e => { if (canHover()) e.currentTarget.style.background = "var(--muted)"; }}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          >
            <X size={18} style={{ color: "var(--muted-foreground)" }} />
          </button>
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

// ── Lexicon tab ───────────────────────────────────────────────────────────────

interface CrossRef { reference: string; quote: string; highlight?: string }

// Bold the English word(s) in a verse that translate the word being searched.
// Uses the phrase the AI marked; falls back to the word's English gloss.
// Build-time concordance (scripts/build-concordance.mjs): one static file per
// hundred Strong's numbers, so finding every occurrence of a word is a single
// cached file read instead of an AI call.
type ConcordanceEntry = { total: number; refs: [string, string][] };
const concordanceFiles = new Map<string, Promise<Record<string, ConcordanceEntry>>>();
const crossRefCache    = new Map<string, { total: number; results: CrossRef[] }>();

function concordanceKey(strongs: string) {
  return (strongs || "").replace(/_[A-Z]$/, "");
}
function concordanceBucket(key: string) {
  const m = key.match(/^([GH])(\d+)/);
  return m ? `${m[1]}${Math.floor(Number(m[2]) / 100)}` : null;
}
function loadConcordanceFile(bucket: string) {
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
function spreadAcrossBooks(refs: [string, string][], limit: number) {
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

const HIGHLIGHT_SKIP = new Set(["a","an","the","of","to","in","on","for","and","or","but","is","was","be","are","were","will","shall","you","he","she","it","they","we","i","me","him","them","us","my","his","her","their","your","our","do","did","does","not","with","from","by","as","at","this","that","these","those","who","which","what","have","has","had","been","let","may"]);

function HighlightedQuote({ quote, highlight, gloss }: { quote: string; highlight?: string; gloss?: string }) {
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

function parseVerseRef(ref: string): { book: string; chapter: number; verse: number } | null {
  // Match "Book Name Chapter:Verse" — book names may include numbers (e.g. "1 Kings")
  const m = ref.match(/^(.+?)\s+(\d+):(\d+)$/)
  if (!m) return null
  return { book: m[1].trim(), chapter: parseInt(m[2]), verse: parseInt(m[3]) }
}

function LexiconTab({ verse, selectedWord, onWordSelect, onNavigateTo, onCrossRefNavigate }: {
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
          {commentaries.map((c, i) => {
            const range = c.verseStart !== undefined && c.verseEnd !== undefined && c.verseEnd > c.verseStart
              ? `On verses ${c.verseStart}–${c.verseEnd}` : null;
            return (
              <article key={c.id} style={{ paddingBottom: "20px", marginBottom: "20px", borderBottom: i < commentaries.length - 1 ? "1px solid var(--border)" : "none" }}>
                <h3 style={{ fontFamily: UI, fontSize: "0.9rem", fontWeight: 600, color: "var(--foreground)", margin: "0 0 2px" }}>{c.author}</h3>
                <div style={{ fontFamily: UI, fontSize: "0.75rem", color: "var(--muted-foreground)", marginBottom: "10px", lineHeight: 1.5 }}>
                  {[c.source, c.era, range].filter(Boolean).join(" · ")}
                </div>
                {c.text.split(/\n\s*\n/).map((para, j) => (
                  <p key={j} style={{ fontFamily: BODY, fontSize: "0.95rem", lineHeight: 1.75, color: "var(--foreground)", margin: j ? "10px 0 0" : 0 }}>{para.trim()}</p>
                ))}
              </article>
            );
          })}
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
                  style={{ textAlign: "left", minHeight: `${TAP}px`, padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--border)", background: "transparent", cursor: "pointer", fontFamily: UI, fontSize: "0.875rem", color: "var(--muted-foreground)", lineHeight: 1.5 }}
                  onMouseEnter={e => { if (canHover()) e.currentTarget.style.background = "var(--muted)"; }}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >{p}</button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", gap: "2px", alignItems: m.role === "user" ? "flex-end" : "flex-start" }}>
            <span style={{ fontFamily: UI, fontSize: "0.75rem", color: "var(--muted-foreground)", marginBottom: "2px" }}>
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
            <span style={{ fontFamily: UI, fontSize: "0.75rem", color: "var(--muted-foreground)" }}>AI Study</span>
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
            aria-label={`Ask about ${verseKey}`}
            enterKeyHint="send"
            rows={1}
            style={{ flex: 1, resize: "none", border: "none", outline: "none", background: "transparent", fontFamily: UI, fontSize: "16px", color: "var(--foreground)", lineHeight: 1.5, maxHeight: "120px", overflow: "auto" }}
          />
          <button
            onClick={() => send(input)}
            disabled={!input.trim() || loading}
            aria-label="Send" style={{ flexShrink: 0, width: "36px", height: "36px", margin: "-4px -6px -4px 0", borderRadius: "8px", border: "none", background: input.trim() && !loading ? "var(--foreground)" : "transparent", cursor: input.trim() && !loading ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.15s" }}
          >
            <Send size={16} style={{ color: input.trim() && !loading ? "var(--background)" : "var(--muted-foreground)" }} />
          </button>
        </div>
        <p style={{ fontFamily: UI, fontSize: "0.75rem", color: "var(--muted-foreground)", margin: "6px 0 0", textAlign: "center" }}>
          <span className="kbd-hint">Shift+Enter for new line · Enter to send · </span>20 messages an hour
        </p>
      </div>
    </div>
  );
}
