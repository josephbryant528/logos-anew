import Anthropic from '@anthropic-ai/sdk'
import { headers } from 'next/headers'

const rateLimitStore = new Map()
const RATE_LIMIT     = 20
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

function buildSystemPrompt(passage) {
  return `You are a biblical study assistant helping the user study ${passage} (ESV).

Guidelines:
- Ground every claim in Scripture, labeling references as [SCRIPTURE: ref ESV]
- When citing a commentary, label it as [COMMENTARY: Author]
- Be conversational but theologically careful
- Keep responses focused and appropriately concise
- You may draw on original Greek/Hebrew vocabulary with Strong's numbers when relevant`
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

  const { passage, messages } = body

  if (!passage) {
    return Response.json({ error: 'passage is required.' }, { status: 400 })
  }

  // messages is an array of { role: 'user' | 'assistant', content: string }
  // Each user turn already has the question; we pass history directly.
  const history = Array.isArray(messages) && messages.length > 0
    ? messages
    : [{ role: 'user', content: `Please give me a brief study overview of this passage.` }]

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  let message
  try {
    message = await client.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 1024,
      system:     buildSystemPrompt(passage),
      messages:   history,
    })
  } catch (err) {
    const status = err.status ?? 500
    const detail = err.error?.error?.message ?? err.message ?? 'Anthropic API error'
    return Response.json({ error: detail }, { status })
  }

  const text = message.content[0]?.type === 'text' ? message.content[0].text : ''
  return Response.json({ result: text })
}
