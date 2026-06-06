import { NextRequest } from 'next/server'
import path from 'path'
import fs from 'fs'

function bookSlug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-')
}

interface OriginalWord {
  id: string
  original: string
  transliteration: string
  gloss: string
  lemma: string
  strongsNumber: string
  partOfSpeech: string
  parsing: string
  extendedDefinition: string
}

interface LexiconVerse {
  verse: number
  words: OriginalWord[]
}

interface LexiconFile {
  book: string
  chapter: number
  language: 'greek' | 'hebrew'
  verses: LexiconVerse[]
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

  const data = JSON.parse(raw.toString()) as LexiconFile
  const language = data.language

  const verses = data.verses.map(({ verse, words }) => ({
    book: data.book,
    chapter: data.chapter,
    verse,
    language,
    text: '',
    translation: 'ESV',
    words,
  }))

  return Response.json({ verses, language })
}
