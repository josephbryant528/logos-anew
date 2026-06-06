import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const book = searchParams.get('book')
  const chapter = searchParams.get('chapter')

  if (!book || !chapter) {
    return Response.json({ error: 'book and chapter required' }, { status: 400 })
  }

  const ref = encodeURIComponent(`${book} ${chapter}`)
  // HNVUG: H=Hebrew/Greek original, N=Strong's numbers, V=verse markers, U=transliteration, G=grammar
  const stepUrl = `https://api.stepbible.org/v2/passage/text?reference=${ref}&options=HNVUG&version=THGNT|OSMHB`

  let stepData: Record<string, unknown>
  try {
    const res = await fetch(stepUrl, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 604800 }, // cache 7 days
    })
    if (!res.ok) {
      return Response.json({ error: `Step Bible API error: ${res.status}` }, { status: res.status })
    }
    stepData = await res.json()
  } catch {
    return Response.json({ error: 'Failed to reach Step Bible API' }, { status: 502 })
  }

  const passageText: string = (stepData.passageText as string) ?? ''
  const language = detectLanguage(book)
  const verses = parseStepBibleHtml(passageText, book, parseInt(chapter), language)

  return Response.json({ verses, language })
}

function detectLanguage(book: string): 'greek' | 'hebrew' {
  const ntBooks = new Set([
    'Matthew', 'Mark', 'Luke', 'John', 'Acts', 'Romans', '1 Corinthians', '2 Corinthians',
    'Galatians', 'Ephesians', 'Philippians', 'Colossians', '1 Thessalonians', '2 Thessalonians',
    '1 Timothy', '2 Timothy', 'Titus', 'Philemon', 'Hebrews', 'James', '1 Peter', '2 Peter',
    '1 John', '2 John', '3 John', 'Jude', 'Revelation',
  ])
  return ntBooks.has(book) ? 'greek' : 'hebrew'
}

type ParsedVerse = {
  book: string; chapter: number; verse: number; language: 'greek' | 'hebrew';
  words: Array<{
    id: string; original: string; transliteration: string; gloss: string;
    lemma: string; strongsNumber: string; partOfSpeech: string; parsing: string;
    extendedDefinition: string;
  }>;
  esv: string; kjv: string;
}

function parseStepBibleHtml(
  html: string,
  book: string,
  chapter: number,
  language: 'greek' | 'hebrew'
): ParsedVerse[] {
  const verseMap = new Map<number, ParsedVerse>()
  const verseOrder: number[] = []

  const normalized = html.replace(/\r\n/g, '\n').replace(/\s+/g, ' ')

  type Token =
    | { type: 'verse'; num: number }
    | { type: 'word'; original: string; translit: string; gloss: string; strongs: string; morph: string; lemma: string }

  const tokens: Token[] = []

  // Combined scanner for:
  // 1. verseNumbers spans: <span class="verseNumbers">N</span>
  // 2. data-verse attributes: data-verse="Book.N"
  // 3. word spans with Strong's: <span ... data-strongsnumber="G1234" ... >...</span>
  const scanPattern = /(?:<span[^>]+class="verseNumbers"[^>]*>\s*(\d+)\s*<\/span>)|(?:data-verse="[A-Za-z0-9 ]*?\.(\d+)")|(?:<span[^>]+(?:data-strongsnumber|data-strongsNumber)="([A-Z]\d+)"([^>]*)>([\s\S]*?)<\/span>)/gi

  let m: RegExpExecArray | null
  while ((m = scanPattern.exec(normalized)) !== null) {
    if (m[1]) {
      tokens.push({ type: 'verse', num: parseInt(m[1]) })
    } else if (m[2]) {
      tokens.push({ type: 'verse', num: parseInt(m[2]) })
    } else if (m[3]) {
      const strongs = m[3]
      const attrs = m[4] ?? ''
      const inner = m[5] ?? ''

      const morphMatch = attrs.match(/data-morph="([^"]+)"/) ?? inner.match(/data-morph="([^"]+)"/)
      const lemmaMatch = attrs.match(/data-root="([^"]+)"/) ?? attrs.match(/data-lemma="([^"]+)"/) ?? inner.match(/data-root="([^"]+)"/)

      const textMatch    = inner.match(/<span[^>]+class="text"[^>]*>(.*?)<\/span>/)
      const transitMatch = inner.match(/<span[^>]+class="translit"[^>]*>(.*?)<\/span>/)
      const glossMatch   = inner.match(/<span[^>]+class="gloss"[^>]*>(.*?)<\/span>/)

      const rawText = inner.replace(/<[^>]+>/g, '').trim()

      tokens.push({
        type: 'word',
        original: stripHtml(textMatch?.[1] ?? rawText),
        translit:  stripHtml(transitMatch?.[1] ?? ''),
        gloss:     stripHtml(glossMatch?.[1] ?? ''),
        strongs,
        morph:   morphMatch?.[1] ?? '',
        lemma:   stripHtml(lemmaMatch?.[1] ?? ''),
      })
    }
  }

  let verseNum = 0
  let wordIdx = 0

  for (const tok of tokens) {
    if (tok.type === 'verse') {
      verseNum = tok.num
      if (!verseMap.has(verseNum)) {
        verseMap.set(verseNum, { book, chapter, verse: verseNum, language, words: [], esv: '', kjv: '' })
        verseOrder.push(verseNum)
      }
    } else if (verseNum > 0) {
      const v = verseMap.get(verseNum)
      if (v) {
        wordIdx++
        v.words.push({
          id: `${book.toLowerCase().replace(/\s/g, '')}.${chapter}.${verseNum}.${wordIdx}`,
          original: tok.original,
          transliteration: tok.translit,
          gloss: tok.gloss,
          lemma: tok.lemma || tok.original,
          strongsNumber: tok.strongs,
          partOfSpeech: posFromMorph(tok.morph),
          parsing: tok.morph,
          extendedDefinition: '',
        })
      }
    }
  }

  return verseOrder.map(n => verseMap.get(n)!).filter(v => v.words.length > 0)
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#\d+;/g, '').trim()
}

function posFromMorph(morph: string): string {
  if (!morph) return 'Word'
  const m = morph.toLowerCase()
  if (m.includes(':n-') || m.startsWith('n-')) return 'Noun'
  if (m.includes(':v-') || m.startsWith('v-')) return 'Verb'
  if (m.includes(':prep') || m.includes('prep')) return 'Preposition'
  if (m.includes(':conj') || m.includes('conj') || m.includes(':cc') || m.includes(':cs')) return 'Conjunction'
  if (m.includes(':art') || m.includes(':t-')) return 'Article'
  if (m.includes(':adj') || m.includes(':a-')) return 'Adjective'
  if (m.includes(':adv') || m.includes('adv')) return 'Adverb'
  if (m.includes(':pron') || m.includes('pron')) return 'Pronoun'
  if (m.includes(':ptcl') || m.includes('ptcl') || m.includes(':x-')) return 'Particle'
  return 'Word'
}
