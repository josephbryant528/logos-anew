// Processes Matthew Henry's Concise Commentary (Public Domain) into per-chapter JSON files.
// Source: https://ccel.org/ccel/h/henry/mhcc/cache/mhcc.txt
// Output: public/commentaries/{book-slug}-{chapter}.json
//
// Run manually:  node scripts/build-commentaries.mjs
// Auto-runs as:  npm run prebuild

import fs   from 'fs'
import path from 'path'
import https from 'https'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT    = path.join(__dirname, '..')
const OUT_DIR = path.join(ROOT, 'public', 'commentaries')
const CACHE   = path.join(ROOT, '.stepbible-data', 'mhcc.txt')
const SOURCE  = 'https://ccel.org/ccel/h/henry/mhcc/cache/mhcc.txt'

fs.mkdirSync(OUT_DIR, { recursive: true })
fs.mkdirSync(path.dirname(CACHE), { recursive: true })

// ── Book name list (canonical order) ─────────────────────────────────────────

const BOOKS = [
  'Genesis','Exodus','Leviticus','Numbers','Deuteronomy',
  'Joshua','Judges','Ruth','1 Samuel','2 Samuel',
  '1 Kings','2 Kings','1 Chronicles','2 Chronicles','Ezra',
  'Nehemiah','Esther','Job','Psalms','Proverbs',
  'Ecclesiastes','Song of Solomon','Isaiah','Jeremiah','Lamentations',
  'Ezekiel','Daniel','Hosea','Joel','Amos',
  'Obadiah','Jonah','Micah','Nahum','Habakkuk',
  'Zephaniah','Haggai','Zechariah','Malachi',
  'Matthew','Mark','Luke','John','Acts',
  'Romans','1 Corinthians','2 Corinthians','Galatians','Ephesians',
  'Philippians','Colossians','1 Thessalonians','2 Thessalonians',
  '1 Timothy','2 Timothy','Titus','Philemon','Hebrews',
  'James','1 Peter','2 Peter','1 John','2 John',
  '3 John','Jude','Revelation',
]

// Alternate names the text may use
const BOOK_ALIASES = {
  'Song of Solomon': ['Song of Solomon', 'The Song of Solomon', 'Song Of Solomon'],
  'Psalms':          ['Psalms', 'The Psalms'],
  '1 Samuel':        ['1 Samuel', '1Samuel'],
  '2 Samuel':        ['2 Samuel', '2Samuel'],
  '1 Kings':         ['1 Kings', '1Kings'],
  '2 Kings':         ['2 Kings', '2Kings'],
  '1 Chronicles':    ['1 Chronicles', '1Chronicles'],
  '2 Chronicles':    ['2 Chronicles', '2Chronicles'],
  '1 Corinthians':   ['1 Corinthians', '1Corinthians'],
  '2 Corinthians':   ['2 Corinthians', '2Corinthians'],
  '1 Thessalonians': ['1 Thessalonians', '1Thessalonians'],
  '2 Thessalonians': ['2 Thessalonians', '2Thessalonians'],
  '1 Timothy':       ['1 Timothy', '1Timothy'],
  '2 Timothy':       ['2 Timothy', '2Timothy'],
  '1 Peter':         ['1 Peter', '1Peter'],
  '2 Peter':         ['2 Peter', '2Peter'],
  '1 John':          ['1 John', '1John'],
  '2 John':          ['2 John', '2John'],
  '3 John':          ['3 John', '3John'],
}

function bookSlug(name) {
  return name.toLowerCase().replace(/\s+/g, '-')
}

// ── Download helper ───────────────────────────────────────────────────────────

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest)
    const get = (u) => {
      https.get(u, res => {
        if (res.statusCode === 301 || res.statusCode === 302) { get(res.headers.location); return }
        if (res.statusCode !== 200) { reject(new Error(`HTTP ${res.statusCode}`)); return }
        res.pipe(file)
        file.on('finish', () => file.close(resolve))
      }).on('error', reject)
    }
    get(url)
  })
}

// ── Parse MHCC plain text ─────────────────────────────────────────────────────
//
// Layout of the CCEL file (checked against the full text, Nov 2026):
//   ______________________            <- divider before each book
//                 2 Kings             <- centred book name, then a book intro
//   Chapter 18                        <- column 0
//      Chapter Outline                <- outline lines, each with a "(1-8)" range
//   Verses 1-8                        <- column 0; commentary lines are indented
//
// Chapters that are not divided into sections have no "Verses" lines: a short
// summary line, then the commentary, which opens with "--".
//
// The text is reproduced word for word. The only changes are layout:
// - wrapped lines are joined, paragraph breaks are kept;
// - "--" (the plain-text stand-in for a dash) becomes "—";
// - a "(Job 1:20-22)" style marker at the very end of a section is dropped.
//   CCEL puts these after a section as a link to the next one; they are not
//   part of Henry's sentence.

const HEADING_RE = /^Verses? (\d+)(?:\s*[-,]\s*(\d+))?\s*$/   // column 0 only
const CHAPTER_RE = /^Chapter (\d+)\s*$/                          // column 0 only
const INLINE_RE = /^(?:[1-3] ?)?[A-Z][a-z]*\.? (\d+):(\d+)(?:-(?:(\d+):)?(\d+))? /
const TRAILING_REF_RE = /\s*\((?:[1-3] ?)?[A-Z][a-z]{1,4} (\d+):(\d+)(?:-(\d+))?\)$/

function paragraphs(lines) {
  const paras = []
  let cur = []
  for (const l of lines) {
    if (l.trim() === '') { if (cur.length) { paras.push(cur.join(' ')); cur = [] } }
    else cur.push(l.trim())
  }
  if (cur.length) paras.push(cur.join(' '))
  return paras.map(p => p.replace(/\s+/g, ' ').trim()).filter(Boolean)
}

function tidy(paras, chapter) {
  let text = paras.join('\n\n')
  const m = text.match(TRAILING_REF_RE)
  if (m && Number(m[1]) === chapter) text = text.slice(0, m.index)
  text = text.replace(/^--\s*/, '').replace(/--/g, '—')
  return text.trim()
}

export function parseMHCC(text, stats = {}) {
  // Result: Map<bookSlug-chapter, { book, chapter, entries: [{verseStart, verseEnd, wholeChapter?, text}] }>
  const chapters = new Map()
  const lines = text.split(/\r?\n/)

  const bookByAlias = new Map()
  for (const book of BOOKS) {
    for (const alias of BOOK_ALIASES[book] ?? [book]) bookByAlias.set(alias.trim(), book)
  }

  stats.unsectioned = []
  stats.outlineWithText = []
  stats.dividerless = []

  let book = null, chapter = null, block = [], implicitChapter = false

  function flushChapter() {
    const implicit = implicitChapter
    implicitChapter = false
    if (!book || !chapter) { block = []; return }
    if (implicit) {
      const looksLikeChapter = block.some(l => HEADING_RE.test(l)) || paragraphs(block).some(p => p.startsWith('--'))
      if (!looksLikeChapter) { block = []; return }
      ;(stats.implicitChapter1 ||= []).push(book)
    }
    const key = `${bookSlug(book)}-${chapter}`
    const entries = []
    // Split the chapter into sections at each "Verses" heading.
    let pre = [], section = null
    const sections = []
    for (const l of block) {
      const h = l.match(HEADING_RE)
      if (h) {
        if (section) sections.push(section)
        const a = parseInt(h[1]), b = h[2] ? parseInt(h[2]) : a
        section = { verseStart: Math.min(a, b), verseEnd: Math.max(a, b), lines: [] }
      } else if (section) section.lines.push(l)
      else pre.push(l)
    }
    if (section) sections.push(section)

    if (sections.length) {
      // Everything before the first heading is the chapter outline.
      const preParas = paragraphs(pre).filter(p => p !== 'Chapter Outline' && !/^\([\d,\s-]+\)$/.test(p))
      if (!pre.some(l => l.trim() === 'Chapter Outline') && preParas.length) stats.outlineWithText.push(key)
      for (const s of sections) {
        const t = tidy(paragraphs(s.lines), chapter)
        if (t) entries.push({ verseStart: s.verseStart, verseEnd: s.verseEnd, text: t })
      }
    } else {
      const paras = paragraphs(pre)
      // From Ecclesiastes on, sections are marked inside the text instead:
      // a paragraph opening with "Is. 2:1-9 " starts the section on those verses.
      const inline = paras.map(p => {
        const m = p.match(INLINE_RE)
        return m && Number(m[1]) === chapter ? m : null
      })
      if (inline.some(Boolean)) {
        let cur = null
        const flush = () => { if (cur) { const t = tidy(cur.paras, chapter); if (t) entries.push({ verseStart: cur.verseStart, verseEnd: cur.verseEnd, text: t }) } }
        paras.forEach((p, idx) => {
          const m = inline[idx]
          if (m) {
            flush()
            const a = parseInt(m[2])
            const b = m[4] ? (m[3] && Number(m[3]) !== chapter ? 999 : parseInt(m[4])) : a
            cur = { verseStart: a, verseEnd: Math.max(a, b), paras: [p.slice(m[0].length)] }
          } else if (cur) cur.paras.push(p)
        })
        flush()
        if (entries.length) chapters.set(key, { book, chapter, entries })
        block = []
        return
      }
      // No sections. Usually a one-line summary of the chapter comes first and the
      // commentary opens with "--"; some chapters are a single paragraph.
      let start = paras.findIndex(p => p.startsWith('--'))
      if (start < 0) start = paras.length > 1 && paras[0].length < 200 ? 1 : 0
      if (start > 0 && !paras[start].startsWith('--')) stats.unsectioned.push(`${key}: [${paras.slice(0, start).join(' / ').slice(0, 70)}] ${paras[start].slice(0, 50)}`)
      const t = tidy(paras.slice(start), chapter)
      if (t) entries.push({ verseStart: 1, verseEnd: 999, wholeChapter: true, text: t })
    }
    if (entries.length) chapters.set(key, { book, chapter, entries })
    block = []
  }

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]
    const line = raw.trim()

    if (/^_{5,}$/.test(line)) {
      let j = i + 1
      while (j < lines.length && lines[j].trim() === '') j++
      const matched = bookByAlias.get((lines[j] ?? '').trim())
      if (matched) {
        flushChapter()
        book = matched
        // A few books (2 Kings, 2 Chronicles) go straight into chapter 1 with no
        // "Chapter 1" line. Hold the text as chapter 1; it is dropped as a book
        // introduction unless it has "Verses" sections or a "--" commentary.
        chapter = 1
        implicitChapter = true
        i = j
        continue
      }
      // A divider that is not a book heading ends the current chapter's text.
      if (chapter) { flushChapter(); chapter = null }
      // The indexes follow Revelation; stop there.
      if (/^Index(es)?\b/.test((lines[j] ?? '').trim())) break
      continue
    }

    const c = raw.match(CHAPTER_RE)
    if (c && book) {
      flushChapter()
      chapter = parseInt(c[1])
      continue
    }

    if (chapter) block.push(raw)
  }
  flushChapter()
  return chapters
}

// ── Main ──────────────────────────────────────────────────────────────────────

// Bump when the parser changes so old generated files are rebuilt.
const FORMAT_VERSION = '2'
const sentinel = path.join(OUT_DIR, '.version')
if (process.argv[1] === fileURLToPath(import.meta.url)) {
if (fs.existsSync(sentinel) && fs.readFileSync(sentinel, 'utf8').trim() === FORMAT_VERSION) {
  console.log('Commentary files already present — skipping build.')
  process.exit(0)
}

console.log('Building commentary JSON files from Matthew Henry\'s Concise Commentary (Public Domain)...')

if (!fs.existsSync(CACHE)) {
  process.stdout.write('  Downloading mhcc.txt...')
  await download(SOURCE, CACHE)
  console.log(' done')
}

for (const f of fs.readdirSync(OUT_DIR)) if (f.endsWith('.json')) fs.unlinkSync(path.join(OUT_DIR, f))

const text = fs.readFileSync(CACHE, 'utf8')
const chapters = parseMHCC(text)

let fileCount = 0
for (const [key, data] of chapters) {
  if (data.entries.length === 0) continue
  fs.writeFileSync(path.join(OUT_DIR, `${key}.json`), JSON.stringify(data))
  fileCount++
}

fs.writeFileSync(sentinel, FORMAT_VERSION)

console.log(`Done — ${fileCount} chapter files written to public/commentaries/`)
console.log(`       (${chapters.size} chapters found in source, ${fileCount} with content)`)
}
