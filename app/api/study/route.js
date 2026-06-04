import Anthropic from '@anthropic-ai/sdk'
import { headers } from 'next/headers'

// In-memory rate limit store: { ip -> { count, resetAt } }
const rateLimitStore = new Map()

const RATE_LIMIT = 20
const RATE_WINDOW_MS = 60 * 60 * 1000

function checkRateLimit(ip) {
  const now = Date.now()
  const entry = rateLimitStore.get(ip)

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS })
    return true
  }

  if (entry.count >= RATE_LIMIT) {
    return false
  }

  entry.count++
  return true
}

const SYSTEM_PROMPT = `You are a biblical study assistant. Only reference scripture labeled as [SCRIPTURE: ref ESV] and approved public-domain commentaries labeled as [COMMENTARY: Author]. Never introduce theological claims without a source label.

When given a passage, generate:
1. A 2-sentence passage summary (label any scripture references as [SCRIPTURE: ref ESV])
2. 3 key word studies with original language terms and Strong's numbers
3. 3 discussion questions

Format each section clearly with headings.`

export async function POST(request) {
  const headersList = await headers()
  const ip =
    headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    headersList.get('x-real-ip') ??
    'unknown'

  if (!checkRateLimit(ip)) {
    return Response.json(
      { error: 'Rate limit exceeded. Try again in an hour.' },
      { status: 429 }
    )
  }

  let body
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const { passage, question } = body

  if (!passage) {
    return Response.json({ error: 'passage is required.' }, { status: 400 })
  }

  const userMessage = question
    ? `Passage context: ${passage}\n\nQuestion: ${question}`
    : `Please study this passage: ${passage}`

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  let message
  try {
    message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    })
  } catch (err) {
    const status = err.status ?? 500
    const detail = err.error?.error?.message ?? err.message ?? 'Anthropic API error'
    return Response.json({ error: detail }, { status })
  }

  const text = message.content[0]?.type === 'text' ? message.content[0].text : ''

  return Response.json({ result: text })
}
