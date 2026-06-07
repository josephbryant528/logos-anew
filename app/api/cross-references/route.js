import Anthropic from '@anthropic-ai/sdk'
import { headers } from 'next/headers'

const rateLimitStore = new Map()
const RATE_LIMIT     = 40
const RATE_WINDOW_MS = 60 * 60 * 1000

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

  const { strongsNumber, lemma, original, transliteration, gloss, testament, currentVerse } = body

  if (!strongsNumber || !testament) {
    return Response.json({ error: 'strongsNumber and testament are required.' }, { status: 400 })
  }

  const testamentLabel = testament === 'OT' ? 'Old Testament' : 'New Testament'

  const prompt = `You are a biblical concordance. Find occurrences of the following original language word across the ${testamentLabel}.

Word: ${original} (${transliteration})
Strong's number: ${strongsNumber}
Lemma: ${lemma}
Gloss: "${gloss}"
Exclude this verse: ${currentVerse}

Return ONLY valid JSON in this exact format, with no other text before or after:
{
  "totalCount": <integer — your best estimate of how many times this lemma appears in the ${testamentLabel}>,
  "results": [
    {"reference": "<Book Chapter:Verse>", "quote": "<complete exact ESV text of that verse>"},
    ...up to 25 results
  ]
}

Rules:
- Only include verses where Strong's ${strongsNumber} or a morphological variant of the same root lemma appears
- The "quote" field must contain the complete, verbatim ESV wording of that verse — never summarize, shorten, or paraphrase scripture
- Prioritize theologically significant and contextually varied occurrences across different books
- Search only within the ${testamentLabel}
- Do not include the verse ${currentVerse}
- Use standard English book names (e.g. "Genesis", "1 Kings", "Song of Solomon", "Revelation")`

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  let message
  try {
    message = await client.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 4096,
      messages:   [{ role: 'user', content: prompt }],
    })
  } catch (err) {
    const status = err.status ?? 500
    const detail = err.error?.error?.message ?? err.message ?? 'Anthropic API error'
    return Response.json({ error: detail }, { status })
  }

  const raw = message.content[0]?.type === 'text' ? message.content[0].text : ''

  // Strip markdown code fences if Claude wraps the response
  const cleaned = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()

  let data
  try {
    data = JSON.parse(cleaned)
  } catch {
    return Response.json({ error: 'Failed to parse AI response.' }, { status: 500 })
  }

  return Response.json(data)
}
