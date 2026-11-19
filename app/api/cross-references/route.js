import { headers } from 'next/headers'

// Returns the ESV text for a short list of verse references in one ESV API call.
// The references themselves come from the build-time concordance in
// public/concordance, so no AI call is involved.

const rateLimitStore = new Map()
const RATE_LIMIT     = 120
const RATE_WINDOW_MS = 60 * 60 * 1000
const MAX_REFS       = 25

function checkRateLimit(ip) {
  const now   = Date.now()
  const entry = rateLimitStore.get(ip)
  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS })
    return true
  }
  if (entry.count >= RATE_LIMIT) return false
  entry.count++
  return true
}

const REF_PATTERN = /^[1-3]?\s?[A-Za-z][A-Za-z ]{1,24} \d{1,3}:\d{1,3}$/

export async function POST(request) {
  const headersList = await headers()
  const ip =
    headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    headersList.get('x-real-ip') ??
    'unknown'

  if (!checkRateLimit(ip)) {
    return Response.json({ error: 'Rate limit exceeded. Try again in an hour.' }, { status: 429 })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const references = Array.isArray(body?.references) ? body.references : null
  if (!references || references.length === 0 || references.length > MAX_REFS ||
      !references.every(r => typeof r === 'string' && REF_PATTERN.test(r))) {
    return Response.json({ error: `references must be 1-${MAX_REFS} verse references.` }, { status: 400 })
  }

  const params = new URLSearchParams({
    q: references.join(';'),
    'include-headings': 'false',
    'include-footnotes': 'false',
    'include-verse-numbers': 'false',
    'include-short-copyright': 'false',
    'include-copyright': 'false',
    'include-passage-references': 'false',
    'include-selahs': 'false',
    'indent-poetry': 'false',
    'indent-paragraphs': '0',
  })

  let esvRes
  try {
    esvRes = await fetch(`https://api.esv.org/v3/passage/text/?${params.toString()}`, {
      headers: { Authorization: `Token ${process.env.ESV_API_KEY}` },
    })
  } catch {
    return Response.json({ error: 'Could not reach the ESV API.' }, { status: 502 })
  }
  if (!esvRes.ok) {
    return Response.json({ error: 'ESV API request failed.' }, { status: esvRes.status })
  }

  const data     = await esvRes.json()
  const passages = data.passages ?? []
  const meta     = data.passage_meta ?? []
  // ESV returns one passage per requested reference, in order. If it ever merges
  // them, fall back to its own canonical names so each quote keeps a correct label.
  const aligned  = passages.length === references.length

  const results = passages
    .map((text, i) => ({
      reference: aligned ? references[i] : (meta[i]?.canonical ?? references[i]),
      quote:     String(text).replace(/\s+/g, ' ').trim(),
    }))
    .filter(r => r.quote.length > 0)

  return Response.json({ results })
}
