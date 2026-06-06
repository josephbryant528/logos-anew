// Processes STEPBible TAGNT + TAHOT data files into per-chapter JSON files
// Output: public/lexicon/{bookSlug}-{chapter}.json
// Run: node scripts/build-lexicon.mjs

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import readline from 'readline'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT_DIR = path.join(__dirname, '..', 'public', 'lexicon')
fs.mkdirSync(OUT_DIR, { recursive: true })

// Map STEPBible 3-letter book codes → app book names
const BOOK_MAP = {
  // OT
  Gen:'Genesis', Exo:'Exodus', Lev:'Leviticus', Num:'Numbers', Deu:'Deuteronomy',
  Jos:'Joshua', Jdg:'Judges', Rut:'Ruth', '1Sa':'1 Samuel', '2Sa':'2 Samuel',
  '1Ki':'1 Kings', '2Ki':'2 Kings', '1Ch':'1 Chronicles', '2Ch':'2 Chronicles',
  Ezr:'Ezra', Neh:'Nehemiah', Est:'Esther', Job:'Job', Psa:'Psalms', Pro:'Proverbs',
  Ecc:'Ecclesiastes', Sng:'Song of Solomon', Isa:'Isaiah', Jer:'Jeremiah',
  Lam:'Lamentations', Eze:'Ezekiel', Dan:'Daniel', Hos:'Hosea', Joe:'Joel',
  Amo:'Amos', Oba:'Obadiah', Jon:'Jonah', Mic:'Micah', Nah:'Nahum',
  Hab:'Habakkuk', Zep:'Zephaniah', Hag:'Haggai', Zec:'Zechariah', Mal:'Malachi',
  // NT
  Mat:'Matthew', Mrk:'Mark', Luk:'Luke', Jhn:'John', Act:'Acts', Rom:'Romans',
  '1Co':'1 Corinthians', '2Co':'2 Corinthians', Gal:'Galatians', Eph:'Ephesians',
  Php:'Philippians', Col:'Colossians', '1Th':'1 Thessalonians', '2Th':'2 Thessalonians',
  '1Ti':'1 Timothy', '2Ti':'2 Timothy', Tit:'Titus', Phm:'Philemon',
  Heb:'Hebrews', Jas:'James', '1Pe':'1 Peter', '2Pe':'2 Peter',
  '1Jn':'1 John', '2Jn':'2 John', '3Jn':'3 John', Jud:'Jude', Rev:'Revelation',
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

function posFromMorphGreek(morph) {
  if (!morph) return 'Word'
  const m = morph.toUpperCase()
  if (m.startsWith('N-') || m === 'N') return 'Noun'
  if (m.startsWith('V-') || m === 'V') return 'Verb'
  if (m === 'PREP' || m.startsWith('PREP')) return 'Preposition'
  if (m.startsWith('CONJ') || m === 'CC' || m === 'CS') return 'Conjunction'
  if (m.startsWith('T-') || m === 'T') return 'Article'
  if (m.startsWith('A-') || m === 'A') return 'Adjective'
  if (m.startsWith('ADV') || m === 'D') return 'Adverb'
  if (m.startsWith('P-') || m.startsWith('PRON')) return 'Pronoun'
  if (m.startsWith('PRT') || m === 'X') return 'Particle'
  if (m === 'COND') return 'Conditional'
  if (m === 'INJ') return 'Interjection'
  return 'Word'
}

function posFromMorphHebrew(morph) {
  if (!morph) return 'Word'
  const m = morph.toUpperCase()
  if (m.includes('VQ') || m.includes('VN') || m.includes('VP') || m.startsWith('HV')) return 'Verb'
  if (m.includes('NC') || m.includes('NP') || m.startsWith('HN')) return 'Noun'
  if (m.startsWith('HR')) return 'Preposition'
  if (m.startsWith('HC')) return 'Conjunction'
  if (m.startsWith('HD')) return 'Article'
  if (m.startsWith('HA')) return 'Adjective'
  if (m.startsWith('HT')) return 'Particle'
  if (m.startsWith('HP')) return 'Pronoun'
  return 'Word'
}

// Data held in memory per chapter: Map<"bookSlug-chap", { book, chapter, language, verses: Map<verseNum, words[]> }>
const chapters = new Map()

function getChapter(bookName, chap) {
  const key = `${bookSlug(bookName)}-${chap}`
  if (!chapters.has(key)) {
    chapters.set(key, {
      book: bookName,
      chapter: chap,
      language: NT_BOOKS.has(bookName) ? 'greek' : 'hebrew',
      verses: new Map(),
    })
  }
  return chapters.get(key)
}

// Compact format per word: [original, translit, gloss, lemma, strongs, posCode, parsing]
// posCode: 0=Word 1=Noun 2=Verb 3=Prep 4=Conj 5=Article 6=Adj 7=Adv 8=Pron 9=Particle 10=Other
const POS_CODE = { Word:0, Noun:1, Verb:2, Preposition:3, Conjunction:4, Article:5, Adjective:6, Adverb:7, Pronoun:8, Particle:9, Conditional:10, Interjection:10 }

function flushChapter(key) {
  const ch = chapters.get(key)
  if (!ch) return
  // v: [[verseNum, [[o,t,g,l,s,posCode,parsing,def], ...]], ...]
  const v = []
  for (const [verseNum, words] of [...ch.verses.entries()].sort((a,b) => a[0]-b[0])) {
    v.push([verseNum, words.map(w => [
      w.original,
      w.transliteration,
      w.gloss,
      w.lemma,
      w.strongsNumber,
      POS_CODE[w.partOfSpeech] ?? 0,
      w.parsing,
      w.extendedDefinition,
    ])])
  }
  const out = { b: ch.book, c: ch.chapter, l: ch.language === 'greek' ? 'g' : 'h', v }
  const outPath = path.join(OUT_DIR, `${key}.json`)
  fs.writeFileSync(outPath, JSON.stringify(out))
  chapters.delete(key)
}

// Parse TAGNT (Greek NT) line
function parseGreekLine(line) {
  const cols = line.split('\t')
  const ref = cols[0]
  // ref format: Jhn.1.1#01=NKO
  const refMatch = ref.match(/^(\w+)\.(\d+)\.(\d+)#(\d+)/)
  if (!refMatch) return null
  const [, bookCode, chapStr, verseStr, wordStr] = refMatch
  const bookName = BOOK_MAP[bookCode]
  if (!bookName) return null
  const chap = parseInt(chapStr)
  const verse = parseInt(verseStr)
  const wordIdx = parseInt(wordStr)

  // COL2: "Ἐν (En)" → split on " ("
  const originalRaw = (cols[1] || '').trim()
  const origMatch = originalRaw.match(/^(.+?)\s+\(([^)]+)\)/)
  const original = origMatch ? origMatch[1].replace(/[,;:.!?]$/, '') : originalRaw
  const transliteration = origMatch ? origMatch[2] : ''

  // COL3: gloss
  const gloss = (cols[2] || '').replace(/[\[\]]/g, '').trim()

  // COL4: "G1722=PREP"
  const strongsMorph = (cols[3] || '').trim()
  const smMatch = strongsMorph.match(/^(G\d+\w*)=(.+)$/)
  const strongsRaw = smMatch ? smMatch[1] : strongsMorph.replace(/=.*$/, '')
  const morph = smMatch ? smMatch[2] : ''
  const strongs = strongsRaw.replace(/_[A-Z]$/, '') // remove _A, _B suffixes

  // COL5: "lemma=definition"
  const lemmaDef = (cols[4] || '').trim()
  const ldMatch = lemmaDef.match(/^(.+?)=(.+)$/)
  const lemma = ldMatch ? ldMatch[1] : lemmaDef
  const extendedDefinition = ldMatch ? ldMatch[2] : ''

  return {
    id: `${bookSlug(bookName)}.${chap}.${verse}.${wordIdx}`,
    bookName, chap, verse,
    original, transliteration, gloss, lemma, strongs,
    partOfSpeech: posFromMorphGreek(morph),
    parsing: morph,
    extendedDefinition,
  }
}

// Parse TAHOT (Hebrew OT) line
function parseHebrewLine(line) {
  const cols = line.split('\t')
  const ref = cols[0]
  const refMatch = ref.match(/^(\w+)\.(\d+)\.(\d+)#(\d+)/)
  if (!refMatch) return null
  const [, bookCode, chapStr, verseStr, wordStr] = refMatch
  const bookName = BOOK_MAP[bookCode]
  if (!bookName) return null
  const chap = parseInt(chapStr)
  const verse = parseInt(verseStr)
  const wordIdx = parseInt(wordStr)

  // COL2: Hebrew word (may contain cantillation marks — keep as-is)
  const original = (cols[1] || '').trim()

  // COL3: transliteration
  const transliteration = (cols[2] || '').trim()

  // COL4: gloss (may have slashes for compound words)
  const gloss = (cols[3] || '').replace(/\//g, ' ').replace(/\s+/g, ' ').trim()

  // COL5: Strong's — may be compound "H9003/{H7225G}" — take first H-number
  const strongsRaw = (cols[4] || '').trim()
  // Prefer COL9 (primary strong's) if available
  const strongsPrimary = (cols[8] || '').trim()
  const strongsMatch = (strongsPrimary || strongsRaw).match(/\{?(H\d+\w*)\}?/)
  const strongs = strongsMatch ? strongsMatch[1] : ''

  // COL6: morphology
  const morph = (cols[5] || '').trim()

  // COL12: "H9003=ב=in/{H7225G=רֵאשִׁית=beginning}" — parse lemma+def from primary
  const lemmaDef = (cols[11] || '').trim()
  // Extract definition from format: {H1234=lemma=def}
  const defMatch = lemmaDef.match(/\{?H\d+\w*=([^=}]+)=([^}]+)\}?/)
  const lemma = defMatch ? defMatch[1] : original
  const extendedDefinition = defMatch ? defMatch[2].split('»')[0].split('@')[0].trim() : ''

  return {
    id: `${bookSlug(bookName)}.${chap}.${verse}.${wordIdx}`,
    bookName, chap, verse,
    original, transliteration, gloss, lemma, strongs,
    partOfSpeech: posFromMorphHebrew(morph),
    parsing: morph,
    extendedDefinition,
  }
}

async function processFile(filePath, parser) {
  const rl = readline.createInterface({ input: fs.createReadStream(filePath), crlfDelay: Infinity })
  let lastKey = null
  let lineCount = 0
  let wordCount = 0

  for await (const line of rl) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('=') || trimmed.startsWith('TAGNT') || trimmed.startsWith('TAHOT') ||
        trimmed.startsWith('(') || trimmed.startsWith('All') || trimmed.startsWith('with') ||
        trimmed.startsWith('Introduction') || trimmed.startsWith('Spreadsheet') ||
        trimmed.startsWith('Data') || trimmed.startsWith('This') || trimmed.startsWith('Reference') ||
        trimmed.startsWith('Translators') || trimmed.startsWith('*') || !trimmed.match(/^\w{2,4}\.\d/)) {
      continue
    }

    const word = parser(trimmed)
    if (!word) continue

    const key = `${bookSlug(word.bookName)}-${word.chap}`

    // Flush previous chapter when we move to a new one
    if (lastKey && lastKey !== key) {
      flushChapter(lastKey)
    }
    lastKey = key

    const ch = getChapter(word.bookName, word.chap)
    if (!ch.verses.has(word.verse)) ch.verses.set(word.verse, [])
    ch.verses.get(word.verse).push(word)
    wordCount++
    lineCount++
  }

  // Flush last chapter
  if (lastKey) flushChapter(lastKey)
  console.log(`  ${path.basename(filePath)}: ${wordCount} words`)
}

console.log('Building lexicon JSON files...')

const DATA_DIR = process.env.DATA_DIR || '/tmp/stepdata'
const files = [
  [path.join(DATA_DIR, 'tagnt-mat-jhn.txt'), parseGreekLine],
  [path.join(DATA_DIR, 'tagnt-act-rev.txt'), parseGreekLine],
  [path.join(DATA_DIR, 'tahot-gen-deu.txt'), parseHebrewLine],
  [path.join(DATA_DIR, 'tahot-jos-est.txt'), parseHebrewLine],
  [path.join(DATA_DIR, 'tahot-job-sng.txt'), parseHebrewLine],
  [path.join(DATA_DIR, 'tahot-isa-mal.txt'), parseHebrewLine],
]

for (const [filePath, parser] of files) {
  await processFile(filePath, parser)
}

const fileCount = fs.readdirSync(OUT_DIR).length
console.log(`Done. Generated ${fileCount} chapter files in public/lexicon/`)
