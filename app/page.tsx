'use client'

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { BIBLE_BOOKS, type BibleBook, type OriginalWord, type ScriptureVerse, getCommentariesForVerse, type Commentary } from "./data/scripture";
import { ChevronLeft, ChevronRight, Moon, Sun, BookOpen, ArrowLeft } from "lucide-react";
import { EsvNotice } from "./components/reader/EsvNotice";
import { NavLevel, langLabel, SidebarNav } from "./components/reader/SidebarNav";
import { VerseRow } from "./components/reader/VerseRow";
import { DetailPanel } from "./components/study/DetailPanel";
import { cleanWord, parseEsvLayout, splitEsvIntoVerses } from "./lib/esv";
import { setTheme, useDarkMode, useIsMobile } from "./lib/hooks";
import { NavBtn } from "./ui/controls";
import { UI, BODY, MONO, HEADER_H, canHover, chapterStepBtn, iconBtn } from "./ui/tokens";

// Tapping Aa steps through these; the choice is remembered on this device.
const TEXT_SIZES = [{ name: "Medium", scale: 1 }, { name: "Large", scale: 1.15 }, { name: "Extra large", scale: 1.3 }, { name: "Small", scale: 0.9 }];

type AppMode  = "bible" | "disciplines" | "prayer";

function bookSlugLocal(name: string) { return name.toLowerCase().replace(/\s+/g, '-') }

interface Location { book: string; chapter: number; verse: number | null }

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
  const darkMode = useDarkMode();
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
        const entries: Commentary[] = comData.entries.map((e: { verseStart: number; verseEnd: number; wholeChapter?: boolean; text: string }, i: number) => ({
          id:         `mhcc-${bookSlugLocal(book)}-${chapter}-${i}`,
          source:     comData.source,
          author:     comData.author,
          era:        comData.era,
          verseKey:   `${book} ${chapter}:${e.verseStart}`,
          verseStart: e.verseStart,
          verseEnd:   e.verseEnd,
          wholeChapter: e.wholeChapter,
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
    <div style={{ height: "100dvh", display: "flex", flexDirection: "column", background: "var(--background)", color: "var(--foreground)", fontFamily: UI, paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}>

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
        <NavBtn label={darkMode ? "Light mode" : "Dark mode"} onClick={() => setTheme(darkMode ? "light" : "dark")}>
          {darkMode ? <Sun size={17} style={{ color: "var(--muted-foreground)" }} /> : <Moon size={17} style={{ color: "var(--muted-foreground)" }} />}
        </NavBtn>
      </header>
      {sizeToast && (
        <div role="status" style={{ position: "fixed", top: 60, left: "50%", transform: "translateX(-50%)", zIndex: 60, padding: "6px 14px", borderRadius: 999, background: "var(--foreground)", color: "var(--background)", fontSize: "0.8rem", fontWeight: 500, pointerEvents: "none", boxShadow: "var(--shadow-md)" }}>{sizeToast}</div>
      )}

      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>

        {/* Sidebar */}
        {showSidebar && isMobile && (
          <div onClick={() => setDrawerOpen(false)} aria-hidden
            style={{ position: "fixed", inset: 0, top: `calc(${HEADER_H}px + env(safe-area-inset-top))`, background: "var(--scrim)", zIndex: 39 }} />
        )}
        {showSidebar && (
          <aside style={isMobile
            ? { position: "fixed", top: `calc(${HEADER_H}px + env(safe-area-inset-top))`, left: 0, bottom: 0, width: "min(85vw, 300px)", zIndex: 40, background: "var(--sidebar)", borderRight: "1px solid var(--sidebar-border)", display: "flex", flexDirection: "column", overflowY: "auto", boxShadow: "var(--shadow-md)", paddingBottom: "env(safe-area-inset-bottom)" }
            : { width: "240px", flexShrink: 0, background: "var(--sidebar)", borderRight: "1px solid var(--sidebar-border)", display: "flex", flexDirection: "column", overflowY: "auto" }}>
            {isMobile && (
              <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "16px 16px 12px", borderBottom: "1px solid var(--sidebar-border)", flexShrink: 0 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/icons/icon-192.png" alt="" width={28} height={28} style={{ borderRadius: "7px" }} />
                <span style={{ fontFamily: UI, fontSize: "1rem", fontWeight: 600, color: "var(--foreground)" }}>Unveiled</span>
              </div>
            )}
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
          <div style={{ background: "var(--tint)", borderBottom: "1px solid var(--tint-border)", padding: isMobile ? "16px 16px 12px" : "48px 64px 36px" }}>
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
            ? { position: "fixed", left: 0, right: 0, bottom: 0, height: sheetFull ? `calc(100dvh - ${HEADER_H}px - env(safe-area-inset-top))` : "55dvh", zIndex: 50, background: "var(--card)", display: "flex", flexDirection: "column", paddingBottom: "env(safe-area-inset-bottom)", borderTop: "1px solid var(--border)", borderRadius: sheetFull ? 0 : "14px 14px 0 0", boxShadow: "var(--shadow-sheet)", transition: "height 0.2s ease, border-radius 0.2s ease" }
            : { width: "380px", flexShrink: 0, borderLeft: "1px solid var(--border)", background: "var(--card)", display: "flex", flexDirection: "column" }}>
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
