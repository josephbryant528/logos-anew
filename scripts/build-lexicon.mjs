// Processes STEPBible TAGNT + TAHOT data into per-chapter JSON files
// Output: public/lexicon/{book-slug}-{chapter}.json
//
// Run manually:  node scripts/build-lexicon.mjs
// Auto-runs as:  npm run prebuild (downloads source files if missing)
//
// Source: STEPBible.org CC BY 4.0  github.com/STEPBible/STEPBible-Data

import fs from 'fs'
import path from 'path'
import https from 'https'
import { fileURLToPath } from 'url'
import readline from 'readline'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT      = path.join(__dirname, '..')
const OUT_DIR   = path.join(ROOT, 'public', 'lexicon')
const DATA_DIR  = path.join(ROOT, '.stepbible-data')

fs.mkdirSync(OUT_DIR,  { recursive: true })
fs.mkdirSync(DATA_DIR, { recursive: true })

// ── Source files ─────────────────────────────────────────────────────────────

const BASE = 'https://raw.githubusercontent.com/STEPBible/STEPBible-Data/master/Translators%20Amalgamated%20OT%2BNT/'

const SOURCES = [
  { file: 'tagnt-mat-jhn.txt', url: BASE + 'TAGNT%20Mat-Jhn%20-%20Translators%20Amalgamated%20Greek%20NT%20-%20STEPBible.org%20CC-BY.txt',  parser: 'greek'  },
  { file: 'tagnt-act-rev.txt', url: BASE + 'TAGNT%20Act-Rev%20-%20Translators%20Amalgamated%20Greek%20NT%20-%20STEPBible.org%20CC-BY.txt',  parser: 'greek'  },
  { file: 'tahot-gen-deu.txt', url: BASE + 'TAHOT%20Gen-Deu%20-%20Translators%20Amalgamated%20Hebrew%20OT%20-%20STEPBible.org%20CC%20BY.txt', parser: 'hebrew' },
  { file: 'tahot-jos-est.txt', url: BASE + 'TAHOT%20Jos-Est%20-%20Translators%20Amalgamated%20Hebrew%20OT%20-%20STEPBible.org%20CC%20BY.txt', parser: 'hebrew' },
  { file: 'tahot-job-sng.txt', url: BASE + 'TAHOT%20Job-Sng%20-%20Translators%20Amalgamated%20Hebrew%20OT%20-%20STEPBible.org%20CC%20BY.txt', parser: 'hebrew' },
  { file: 'tahot-isa-mal.txt', url: BASE + 'TAHOT%20Isa-Mal%20-%20Translators%20Amalgamated%20Hebrew%20OT%20-%20STEPBible.org%20CC%20BY.txt', parser: 'hebrew' },
]

// ── Book name map ─────────────────────────────────────────────────────────────

const BOOK_MAP = {
  Gen:'Genesis',    Exo:'Exodus',      Lev:'Leviticus',      Num:'Numbers',       Deu:'Deuteronomy',
  Jos:'Joshua',     Jdg:'Judges',      Rut:'Ruth',           '1Sa':'1 Samuel',    '2Sa':'2 Samuel',
  '1Ki':'1 Kings',  '2Ki':'2 Kings',   '1Ch':'1 Chronicles', '2Ch':'2 Chronicles',Ezr:'Ezra',
  Neh:'Nehemiah',   Est:'Esther',      Job:'Job',            Psa:'Psalms',        Pro:'Proverbs',
  Ecc:'Ecclesiastes',Sng:'Song of Solomon',Isa:'Isaiah',     Jer:'Jeremiah',      Lam:'Lamentations',
  Eze:'Ezekiel',    Dan:'Daniel',      Hos:'Hosea',          Joe:'Joel',          Amo:'Amos',
  Oba:'Obadiah',    Jon:'Jonah',       Mic:'Micah',          Nah:'Nahum',         Hab:'Habakkuk',
  Zep:'Zephaniah',  Hag:'Haggai',      Zec:'Zechariah',      Mal:'Malachi',
  Mat:'Matthew',    Mrk:'Mark',        Luk:'Luke',           Jhn:'John',          Act:'Acts',
  Rom:'Romans',     '1Co':'1 Corinthians','2Co':'2 Corinthians',Gal:'Galatians',  Eph:'Ephesians',
  Php:'Philippians',Col:'Colossians',  '1Th':'1 Thessalonians','2Th':'2 Thessalonians',
  '1Ti':'1 Timothy','2Ti':'2 Timothy', Tit:'Titus',          Phm:'Philemon',      Heb:'Hebrews',
  Jas:'James',      '1Pe':'1 Peter',   '2Pe':'2 Peter',      '1Jn':'1 John',      '2Jn':'2 John',
  '3Jn':'3 John',   Jud:'Jude',        Rev:'Revelation',
}

const NT_BOOKS = new Set([
  'Matthew','Mark','Luke','John','Acts','Romans','1 Corinthians','2 Corinthians',
  'Galatians','Ephesians','Philippians','Colossians','1 Thessalonians','2 Thessalonians',
  '1 Timothy','2 Timothy','Titus','Philemon','Hebrews','James','1 Peter','2 Peter',
  '1 John','2 John','3 John','Jude','Revelation',
])

function bookSlug(name) {
  return name.toLowerCase().replace(/\s+/g, '-')
}

// ── POS helpers ───────────────────────────────────────────────────────────────

function posGreek(morph) {
  if (!morph) return 'Word'
  const m = morph.toUpperCase()
  if (m.startsWith('N-') || m === 'N')       return 'Noun'
  if (m.startsWith('V-') || m === 'V')       return 'Verb'
  if (m.startsWith('PREP') || m === 'PREP')  return 'Preposition'
  if (m.startsWith('CONJ') || m === 'CC' || m === 'CS') return 'Conjunction'
  if (m.startsWith('T-')   || m === 'T')     return 'Article'
  if (m.startsWith('A-')   || m === 'A')     return 'Adjective'
  if (m.startsWith('ADV')  || m === 'D')     return 'Adverb'
  if (m.startsWith('P-')   || m.startsWith('PRON')) return 'Pronoun'
  if (m.startsWith('PRT')  || m === 'X')     return 'Particle'
  if (m === 'COND')                          return 'Conditional'
  if (m === 'INJ')                           return 'Interjection'
  return 'Word'
}

function posHebrew(morph) {
  if (!morph) return 'Word'
  const m = morph.toUpperCase()
  if (m.includes('VQ') || m.includes('VN') || m.includes('VP') || m.startsWith('HV')) return 'Verb'
  if (m.includes('NC') || m.includes('NP') || m.startsWith('HN'))                     return 'Noun'
  if (m.startsWith('HR')) return 'Preposition'
  if (m.startsWith('HC')) return 'Conjunction'
  if (m.startsWith('HD')) return 'Article'
  if (m.startsWith('HA')) return 'Adjective'
  if (m.startsWith('HT')) return 'Particle'
  if (m.startsWith('HP')) return 'Pronoun'
  return 'Word'
}

// ── Line parsers ──────────────────────────────────────────────────────────────

function parseGreek(line) {
  const cols = line.split('\t')
  const m = cols[0].match(/^(\w+)\.(\d+)\.(\d+)#(\d+)/)
  if (!m) return null
  const bookName = BOOK_MAP[m[1]]
  if (!bookName) return null

  const originalRaw = (cols[1] || '').trim()
  const origM = originalRaw.match(/^(.+?)\s+\(([^)]+)\)/)
  const original      = (origM ? origM[1] : originalRaw).replace(/[,;:.!?]$/, '')
  const transliteration = origM ? origM[2] : ''
  const gloss           = (cols[2] || '').replace(/[\[\]]/g, '').trim()
  const smM = (cols[3] || '').match(/^(G\d+\w*)=(.+)$/)
  const strongs    = smM ? smM[1].replace(/_[A-Z]$/, '') : (cols[3] || '').replace(/=.*$/, '').replace(/_[A-Z]$/, '')
  const morph      = smM ? smM[2] : ''
  const ldM = (cols[4] || '').match(/^(.+?)=(.+)$/)
  const lemma      = ldM ? ldM[1] : (cols[4] || '').trim()
  const definition = ldM ? ldM[2] : ''

  return {
    bookName, chapter: parseInt(m[2]), verse: parseInt(m[3]), wordIdx: parseInt(m[4]),
    word: {
      original, transliteration, gloss, lemma,
      strongsNumber: strongs,
      partOfSpeech:  posGreek(morph),
      parsing:       morph,
      extendedDefinition: definition,
    },
  }
}

function parseHebrew(line) {
  const cols = line.split('\t')
  const m = cols[0].match(/^(\w+)\.(\d+)\.(\d+)#(\d+)/)
  if (!m) return null
  const bookName = BOOK_MAP[m[1]]
  if (!bookName) return null

  const original        = (cols[1] || '').trim()
  const transliteration = (cols[2] || '').trim()
  const gloss           = (cols[3] || '').replace(/\//g, ' ').replace(/\s+/g, ' ').trim()
  const strongsPrimary  = (cols[8] || '').trim()
  const strongsRaw      = (cols[4] || '').trim()
  const sM = (strongsPrimary || strongsRaw).match(/\{?(H\d+\w*)\}?/)
  const strongs  = sM ? sM[1] : ''
  const morph    = (cols[5] || '').trim()
  const lemmaDef = (cols[11] || '').trim()
  const defM = lemmaDef.match(/\{?H\d+\w*=([^=}]+)=([^}]+)\}?/)
  const lemma      = defM ? defM[1] : original
  const definition = defM ? defM[2].split('»')[0].split('@')[0].trim() : ''

  return {
    bookName, chapter: parseInt(m[2]), verse: parseInt(m[3]), wordIdx: parseInt(m[4]),
    word: {
      original, transliteration, gloss, lemma,
      strongsNumber: strongs,
      partOfSpeech:  posHebrew(morph),
      parsing:       morph,
      extendedDefinition: definition,
    },
  }
}

// ── Chapter buffer & flush ────────────────────────────────────────────────────

const chapters = new Map()    // key → { book, chapter, language, verses: Map<verseNum, words[]> }
const chapterOrder = []        // insertion order for stable output

function getChapter(bookName, chapter) {
  const key = `${bookSlug(bookName)}-${chapter}`
  if (!chapters.has(key)) {
    chapters.set(key, {
      book: bookName,
      chapter,
      language: NT_BOOKS.has(bookName) ? 'greek' : 'hebrew',
      verses: new Map(),
    })
    chapterOrder.push(key)
  }
  return { key, ch: chapters.get(key) }
}

function flushChapter(key) {
  const ch = chapters.get(key)
  if (!ch) return
  const verses = []
  for (const [verseNum, words] of [...ch.verses.entries()].sort((a, b) => a[0] - b[0])) {
    verses.push({ verse: verseNum, words })
  }
  const out = { book: ch.book, chapter: ch.chapter, language: ch.language, verses }
  fs.writeFileSync(path.join(OUT_DIR, `${key}.json`), JSON.stringify(out))
  chapters.delete(key)
}

// ── Download helper ───────────────────────────────────────────────────────────

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest)
    const get = (u) => {
      https.get(u, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          get(res.headers.location)
          return
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} for ${u}`))
          return
        }
        res.pipe(file)
        file.on('finish', () => file.close(resolve))
      }).on('error', reject)
    }
    get(url)
  })
}

// ── Main ──────────────────────────────────────────────────────────────────────

// Skip entirely if output already exists (local dev — files were previously generated)
const sentinel = path.join(OUT_DIR, 'john-1.json')
if (fs.existsSync(sentinel)) {
  console.log('Lexicon files already present — skipping build.')
  process.exit(0)
}

console.log('Building lexicon JSON files from STEPBible data (CC BY 4.0)...')

for (const { file, url, parser } of SOURCES) {
  const dest = path.join(DATA_DIR, file)
  if (!fs.existsSync(dest)) {
    process.stdout.write(`  Downloading ${file}...`)
    await download(url, dest)
    console.log(' done')
  }

  process.stdout.write(`  Parsing ${file}...`)
  const parseFn = parser === 'greek' ? parseGreek : parseHebrew
  const rl = readline.createInterface({ input: fs.createReadStream(dest), crlfDelay: Infinity })
  let lastKey = null
  let count = 0

  for await (const line of rl) {
    const trimmed = line.trim()
    if (!trimmed || !trimmed.match(/^\w{2,4}\.\d/)) continue
    const result = parseFn(trimmed)
    if (!result) continue

    const { key, ch } = getChapter(result.bookName, result.chapter)
    if (lastKey && lastKey !== key) flushChapter(lastKey)
    lastKey = key

    if (!ch.verses.has(result.verse)) ch.verses.set(result.verse, [])
    const words = ch.verses.get(result.verse)
    ch.verses.get(result.verse).push({
      id: `${bookSlug(result.bookName)}.${result.chapter}.${result.verse}.${result.wordIdx}`,
      ...result.word,
    })
    count++
  }

  if (lastKey) flushChapter(lastKey)
  console.log(` ${count.toLocaleString()} words`)
}

const total = fs.readdirSync(OUT_DIR).filter(f => f.endsWith('.json')).length
console.log(`\nDone — ${total} chapter files written to public/lexicon/`)
