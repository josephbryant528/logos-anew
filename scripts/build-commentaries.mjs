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

function parseMHCC(text) {
  // Result: Map<bookSlug-chapter, { book, chapter, entries: [{verseStart, verseEnd, text}] }>
  const chapters = new Map()

  const lines = text.split('\n')
  let currentBook    = null
  let currentChapter = null
  let currentVerses  = null
  let currentText    = []

  // Build a set of all recognized book names (including aliases) for fast lookup
  const bookByAlias = new Map()
  for (const book of BOOKS) {
    const aliases = BOOK_ALIASES[book] ?? [book]
    for (const alias of aliases) bookByAlias.set(alias.trim(), book)
  }

  function saveCurrentEntry() {
    if (!currentBook || !currentChapter || !currentVerses) return
    const txt = currentText.join(' ').replace(/\s+/g, ' ').trim()
    if (!txt) return
    const key = `${bookSlug(currentBook)}-${currentChapter}`
    if (!chapters.has(key)) {
      chapters.set(key, { book: currentBook, chapter: currentChapter, entries: [] })
    }
    chapters.get(key).entries.push({ ...currentVerses, text: txt })
    currentText = []
  }

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]
    const line = raw.trim()

    // Detect book heading: ____ divider followed by blank line then centered book name
    if (line.startsWith('___')) {
      // Skip blank line(s), then check for centered book name
      let j = i + 1
      while (j < lines.length && lines[j].trim() === '') j++
      const candidate = (lines[j] ?? '').trim()
      const matched   = bookByAlias.get(candidate)
      if (matched) {
        saveCurrentEntry()
        currentBook    = matched
        currentChapter = null
        currentVerses  = null
        currentText    = []
        i = j  // advance past the book name line
        continue
      }
    }

    // Detect chapter heading (no leading spaces)
    const chapterMatch = line.match(/^Chapter (\d+)$/)
    if (chapterMatch) {
      saveCurrentEntry()
      currentChapter = parseInt(chapterMatch[1])
      currentVerses  = null
      currentText    = []
      continue
    }

    // Detect verse range heading
    const verseMatch = line.match(/^Verses? (\d+)(?:[,\-]\s*(\d+))?/)
    if (verseMatch && currentChapter) {
      saveCurrentEntry()
      const start = parseInt(verseMatch[1])
      const end   = verseMatch[2] ? parseInt(verseMatch[2]) : start
      currentVerses = { verseStart: start, verseEnd: end }
      currentText   = []
      continue
    }

    // Skip chapter outline tables (lines that are just numbers in parens)
    if (line.match(/^\(\d+(?:,\s*\d+)*\)$/) || line.match(/^\(\d+\-\d+\)$/)) continue

    // Skip the "Chapter Outline" header itself
    if (line === 'Chapter Outline') continue

    // Accumulate text for current verse entry
    if (currentVerses && line.length > 0 && !line.startsWith('_')) {
      currentText.push(line)
    }
  }
  saveCurrentEntry()

  return chapters
}

// ── Main ──────────────────────────────────────────────────────────────────────

const sentinel = path.join(OUT_DIR, 'john-1.json')
if (fs.existsSync(sentinel)) {
  console.log('Commentary files already present — skipping build.')
  process.exit(0)
}

console.log('Building commentary JSON files from Matthew Henry\'s Concise Commentary (Public Domain)...')

if (!fs.existsSync(CACHE)) {
  process.stdout.write('  Downloading mhcc.txt...')
  await download(SOURCE, CACHE)
  console.log(' done')
}

const text = fs.readFileSync(CACHE, 'utf8')
const chapters = parseMHCC(text)

let fileCount = 0
for (const [key, data] of chapters) {
  if (data.entries.length === 0) continue
  fs.writeFileSync(path.join(OUT_DIR, `${key}.json`), JSON.stringify(data))
  fileCount++
}

console.log(`Done — ${fileCount} chapter files written to public/commentaries/`)
console.log(`       (${chapters.size} chapters found in source, ${fileCount} with content)`)
