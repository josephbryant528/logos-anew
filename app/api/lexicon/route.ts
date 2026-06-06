import { NextRequest } from 'next/server'
import path from 'path'
import fs from 'fs'

// pos code → label (matches compact format from build-lexicon.mjs)
const POS_LABELS = ['Word','Noun','Verb','Preposition','Conjunction','Article','Adjective','Adverb','Pronoun','Particle','Other']

function bookSlug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-')
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const book = searchParams.get('book')
  const chapter = searchParams.get('chapter')

  if (!book || !chapter) {
    return Response.json({ error: 'book and chapter required' }, { status: 400 })
  }

  const slug = `${bookSlug(book)}-${chapter}`
  const filePath = path.join(process.cwd(), 'public', 'lexicon', `${slug}.json`)

  let raw: Buffer
  try {
    raw = fs.readFileSync(filePath)
  } catch {
    return Response.json({ verses: [] })
  }

  // Compact format: { b, c, l: 'g'|'h', v: [[verseNum, [[o,t,g,l,s,posCode,parsing,def], ...]], ...] }
  const data = JSON.parse(raw.toString()) as {
    b: string; c: number; l: 'g' | 'h';
    v: Array<[number, Array<[string, string, string, string, string, number, string, string]>]>
  }

  const language = data.l === 'g' ? 'greek' : 'hebrew'

  const verses = data.v.map(([verseNum, words]) => ({
    book: data.b,
    chapter: data.c,
    verse: verseNum,
    language,
    esv: '',
    kjv: '',
    words: words.map(([original, transliteration, gloss, lemma, strongsNumber, posCode, parsing, extendedDefinition], idx) => ({
      id: `${bookSlug(data.b)}.${data.c}.${verseNum}.${idx + 1}`,
      original,
      transliteration,
      gloss,
      lemma,
      strongsNumber,
      partOfSpeech: POS_LABELS[posCode] ?? 'Word',
      parsing,
      extendedDefinition,
    })),
  }))

  return Response.json({ verses, language })
}
