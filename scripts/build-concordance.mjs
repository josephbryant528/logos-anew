// Builds a Strong's-number concordance from the per-chapter lexicon files.
// Output: public/concordance/{bucket}.json, one file per hundred Strong's numbers
// (bucket "G0" holds G0001-G0099, "H85" holds H8500-H8599), shaped as
//   { "G0025": { "total": n, "refs": [["John 3:16", "loved"], ...] }, ... }
// Runs after build-lexicon.mjs in `npm run prebuild`.

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT    = path.join(__dirname, '..')
const LEX_DIR = path.join(ROOT, 'public', 'lexicon')
const OUT_DIR = path.join(ROOT, 'public', 'concordance')

// Same order the Bible is printed in, so results read in canonical order.
const BOOK_ORDER = [
  'Genesis','Exodus','Leviticus','Numbers','Deuteronomy','Joshua','Judges','Ruth','1 Samuel','2 Samuel',
  '1 Kings','2 Kings','1 Chronicles','2 Chronicles','Ezra','Nehemiah','Esther','Job','Psalms','Proverbs',
  'Ecclesiastes','Song of Solomon','Isaiah','Jeremiah','Lamentations','Ezekiel','Daniel','Hosea','Joel','Amos',
  'Obadiah','Jonah','Micah','Nahum','Habakkuk','Zephaniah','Haggai','Zechariah','Malachi',
  'Matthew','Mark','Luke','John','Acts','Romans','1 Corinthians','2 Corinthians','Galatians','Ephesians',
  'Philippians','Colossians','1 Thessalonians','2 Thessalonians','1 Timothy','2 Timothy','Titus','Philemon',
  'Hebrews','James','1 Peter','2 Peter','1 John','2 John','3 John','Jude','Revelation',
]
const bookIndex = new Map(BOOK_ORDER.map((b, i) => [b, i]))

// Keep in sync with concordanceKey/concordanceBucket in app/page.tsx.
function concordanceKey(strongs) {
  return (strongs || '').replace(/_[A-Z]$/, '')
}
function concordanceBucket(key) {
  const m = key.match(/^([GH])(\d+)/)
  return m ? `${m[1]}${Math.floor(Number(m[2]) / 100)}` : null
}

if (!fs.existsSync(LEX_DIR)) {
  console.error('build-concordance: public/lexicon is missing; run build-lexicon.mjs first.')
  process.exit(1)
}

const chapters = fs.readdirSync(LEX_DIR)
  .filter(f => f.endsWith('.json'))
  .map(f => JSON.parse(fs.readFileSync(path.join(LEX_DIR, f), 'utf8')))
  .sort((a, b) => (bookIndex.get(a.book) ?? 999) - (bookIndex.get(b.book) ?? 999) || a.chapter - b.chapter)

const index = new Map()
for (const ch of chapters) {
  for (const v of ch.verses ?? []) {
    const ref = `${ch.book} ${ch.chapter}:${v.verse}`
    for (const w of v.words ?? []) {
      const key = concordanceKey(w.strongsNumber)
      if (!key) continue
      let entry = index.get(key)
      if (!entry) { entry = { refs: [], seen: new Set() }; index.set(key, entry) }
      if (entry.seen.has(ref)) continue
      entry.seen.add(ref)
      entry.refs.push([ref, w.gloss ?? ''])
    }
  }
}

fs.rmSync(OUT_DIR, { recursive: true, force: true })
fs.mkdirSync(OUT_DIR, { recursive: true })
const buckets = new Map()
for (const [key, { refs }] of index) {
  const bucket = concordanceBucket(key)
  if (!bucket) continue
  if (!buckets.has(bucket)) buckets.set(bucket, {})
  buckets.get(bucket)[key] = { total: refs.length, refs }
}
for (const [bucket, entries] of buckets) {
  fs.writeFileSync(path.join(OUT_DIR, `${bucket}.json`), JSON.stringify(entries))
}
console.log(`build-concordance: wrote ${index.size} entries in ${buckets.size} files`)
