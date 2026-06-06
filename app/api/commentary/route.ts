import { NextRequest } from 'next/server'
import path from 'path'
import fs from 'fs'

interface CommentaryEntry {
  verseStart: number
  verseEnd: number
  text: string
}

interface CommentaryFile {
  book: string
  chapter: number
  entries: CommentaryEntry[]
}

function bookSlug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-')
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const book    = searchParams.get('book')
  const chapter = searchParams.get('chapter')

  if (!book || !chapter) {
    return Response.json({ error: 'book and chapter required' }, { status: 400 })
  }

  const slug     = `${bookSlug(book)}-${chapter}`
  const filePath = path.join(process.cwd(), 'public', 'commentaries', `${slug}.json`)

  let raw: Buffer
  try {
    raw = fs.readFileSync(filePath)
  } catch {
    return Response.json({ entries: [] })
  }

  const data = JSON.parse(raw.toString()) as CommentaryFile

  return Response.json({
    book:    data.book,
    chapter: data.chapter,
    author:  'Matthew Henry',
    era:     '1706',
    source:  "Matthew Henry's Concise Commentary (Public Domain)",
    entries: data.entries,
  })
}
