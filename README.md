# Unveiled

A Scripture study app: read a passage, tap any word to see the original Greek or Hebrew with its transliteration and meaning, and see where else that word is used in Scripture.

> "And we all, with unveiled face, beholding the glory of the Lord, are being transformed into the same image." (2 Corinthians 3:18, ESV)

## Running it locally

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

## Settings

- `ESV_API_KEY`: Bible text from the ESV API.
- `ANTHROPIC_API_KEY`: word studies and cross-references.
- `APP_PASSCODE` (optional): when set, the app asks for this passcode before it opens.

The code, repository and Vercel project still use the older name `logos-anew`.
