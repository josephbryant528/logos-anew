export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const ref = searchParams.get('q')

  if (!ref) {
    return Response.json({ error: 'q parameter is required.' }, { status: 400 })
  }

  const params = new URLSearchParams({
    q: ref,
    'include-headings': 'false',
    'include-footnotes': 'false',
    'include-verse-numbers': 'false',
    'include-short-copyright': 'false',
    'include-copyright': 'false',
    'include-passage-references': 'false',
  })

  const esvRes = await fetch(
    `https://api.esv.org/v3/passage/text/?${params.toString()}`,
    {
      headers: {
        Authorization: `Token ${process.env.ESV_API_KEY}`,
      },
    }
  )

  if (!esvRes.ok) {
    return Response.json(
      { error: 'ESV API request failed.' },
      { status: esvRes.status }
    )
  }

  const data = await esvRes.json()
  const passages = (data.passages ?? []).map((p) => p.trim()).join('\n\n')

  return Response.json({ passage: passages, reference: data.canonical ?? ref })
}
