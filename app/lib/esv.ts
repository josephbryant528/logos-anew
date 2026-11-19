import { type OriginalWord, type VerseLayout } from "../data/scripture";

// The lexicon data marks morpheme breaks ("/", "\\"), syllables (".") and
// cantillation; strip those so words read cleanly on screen.
export function cleanOriginal(text: string) {
  return text
    .replace(/[\u0591-\u05AF\u05BD]/g, "") // Hebrew cantillation accents and meteg
    .replace(/[\/\\\u05C3\u05BE:]/g, "") // morpheme breaks, sof pasuq, maqaf
    .replace(/[\u00B6\u00A7]/g, "") // paragraph marks from the source text
    .trim();
}
export function cleanTransliteration(text: string) {
  return text.replace(/[\/\\.]/g, "").replace(/-+$/, "").toLowerCase().trim();
}
export function cleanGloss(text: string) {
  const withoutUntranslated = text.replace(/<[^>]*>/g, "").replace(/[\[\]]/g, "").replace(/\s+/g, " ").trim();
  if (withoutUntranslated) return withoutUntranslated;
  const inner = text.replace(/[<>\[\]]/g, "").trim();
  return inner === "obj." ? "(object marker)" : inner;
}
export function cleanWord(w: OriginalWord): OriginalWord {
  return { ...w, original: cleanOriginal(w.original), transliteration: cleanTransliteration(w.transliteration), gloss: cleanGloss(w.gloss) };
}

// The ESV plain-text format carries the page layout in its whitespace:
//   "\n\n  [9] ..."         a prose paragraph starts (indent 2, or 6 after poetry)
//   "\n    line" / 8 spaces  a poetry line, at indent level 0 / 1
//   "\n    \n    \n"       a stanza break
//   an unindented line with no verse number is a section heading (or a psalm title)
export function parseEsvLayout(passage: string): Record<number, VerseLayout> {
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
export function splitEsvIntoVerses(passage: string): Record<number, string> {
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
