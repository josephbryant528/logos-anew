'use client'

import { useState } from 'react'

const GOLD = '#b8972e'
const BLUE = '#2563eb'

const styles = {
  page: {
    minHeight: '100vh',
    background: '#faf8f4',
    fontFamily: 'Georgia, "Times New Roman", serif',
    color: '#1a1a1a',
    padding: '0 0 4rem',
  },
  header: {
    textAlign: 'center',
    padding: '2.5rem 1rem 1rem',
    borderBottom: `2px solid ${GOLD}`,
    marginBottom: '2rem',
  },
  title: {
    fontSize: '2rem',
    fontWeight: 'bold',
    letterSpacing: '0.04em',
    color: '#2a1a00',
    margin: 0,
  },
  subtitle: {
    fontSize: '0.95rem',
    color: '#7a6040',
    marginTop: '0.4rem',
  },
  tabs: {
    display: 'flex',
    justifyContent: 'center',
    gap: '0.25rem',
    marginBottom: '2rem',
    flexWrap: 'wrap',
  },
  tabButton: (active) => ({
    padding: '0.5rem 1.4rem',
    border: `1px solid ${active ? GOLD : '#ccc'}`,
    borderBottom: active ? `3px solid ${GOLD}` : '1px solid #ccc',
    background: active ? '#fffbf0' : '#fff',
    color: active ? '#2a1a00' : '#666',
    cursor: 'pointer',
    fontFamily: 'Georgia, "Times New Roman", serif',
    fontSize: '0.95rem',
    borderRadius: '4px 4px 0 0',
    fontWeight: active ? 'bold' : 'normal',
  }),
  container: {
    maxWidth: '760px',
    margin: '0 auto',
    padding: '0 1.5rem',
  },
  label: {
    display: 'block',
    fontSize: '0.85rem',
    fontWeight: 'bold',
    marginBottom: '0.4rem',
    color: '#4a3000',
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
  },
  input: {
    width: '100%',
    padding: '0.6rem 0.8rem',
    border: '1px solid #ccc',
    borderRadius: '4px',
    fontFamily: 'Georgia, "Times New Roman", serif',
    fontSize: '1rem',
    boxSizing: 'border-box',
    background: '#fff',
  },
  textarea: {
    width: '100%',
    padding: '0.6rem 0.8rem',
    border: '1px solid #ccc',
    borderRadius: '4px',
    fontFamily: 'Georgia, "Times New Roman", serif',
    fontSize: '1rem',
    boxSizing: 'border-box',
    background: '#fff',
    resize: 'vertical',
    minHeight: '80px',
  },
  button: {
    marginTop: '0.75rem',
    padding: '0.55rem 1.4rem',
    background: GOLD,
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontFamily: 'Georgia, "Times New Roman", serif',
    fontSize: '1rem',
    fontWeight: 'bold',
    letterSpacing: '0.03em',
  },
  scriptureBlock: {
    marginTop: '1.5rem',
    border: `2px solid ${GOLD}`,
    borderRadius: '6px',
    padding: '1.25rem 1.5rem',
    background: '#fffdf5',
    lineHeight: '1.8',
    fontSize: '1.05rem',
    whiteSpace: 'pre-wrap',
  },
  referenceLabel: {
    fontSize: '0.8rem',
    fontWeight: 'bold',
    color: GOLD,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: '0.5rem',
  },
  resultBlock: {
    marginTop: '1.5rem',
    lineHeight: '1.7',
    fontSize: '0.98rem',
    whiteSpace: 'pre-wrap',
  },
  error: {
    marginTop: '1rem',
    color: '#c0392b',
    fontSize: '0.92rem',
  },
  loading: {
    marginTop: '1rem',
    color: '#7a6040',
    fontStyle: 'italic',
    fontSize: '0.95rem',
  },
  formGroup: {
    marginBottom: '1rem',
  },
}

function parseBadges(text) {
  const parts = []
  const regex = /\[(SCRIPTURE|COMMENTARY):([^\]]+)\]/g
  let last = 0
  let match

  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) {
      parts.push({ type: 'text', value: text.slice(last, match.index) })
    }
    parts.push({ type: match[1], value: match[2].trim() })
    last = regex.lastIndex
  }

  if (last < text.length) {
    parts.push({ type: 'text', value: text.slice(last) })
  }

  return parts
}

function BadgedText({ text }) {
  const parts = parseBadges(text)
  return (
    <>
      {parts.map((p, i) => {
        if (p.type === 'SCRIPTURE') {
          return (
            <span
              key={i}
              style={{
                display: 'inline-block',
                background: '#fffbea',
                border: `1px solid ${GOLD}`,
                color: '#7a5c00',
                borderRadius: '3px',
                padding: '0 0.4em',
                fontSize: '0.82em',
                fontWeight: 'bold',
                margin: '0 0.1em',
                verticalAlign: 'middle',
              }}
            >
              {p.value}
            </span>
          )
        }
        if (p.type === 'COMMENTARY') {
          return (
            <span
              key={i}
              style={{
                display: 'inline-block',
                background: '#eff6ff',
                border: `1px solid ${BLUE}`,
                color: '#1e40af',
                borderRadius: '3px',
                padding: '0 0.4em',
                fontSize: '0.82em',
                fontWeight: 'bold',
                margin: '0 0.1em',
                verticalAlign: 'middle',
              }}
            >
              {p.value}
            </span>
          )
        }
        return <span key={i}>{p.value}</span>
      })}
    </>
  )
}

function ReaderTab() {
  const [ref, setRef] = useState('')
  const [passage, setPassage] = useState(null)
  const [canonical, setCanonical] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function fetchPassage(e) {
    e.preventDefault()
    if (!ref.trim()) return
    setLoading(true)
    setError('')
    setPassage(null)
    try {
      const res = await fetch(`/api/passage?q=${encodeURIComponent(ref.trim())}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to fetch passage.')
      setPassage(data.passage)
      setCanonical(data.reference)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.container}>
      <form onSubmit={fetchPassage}>
        <div style={styles.formGroup}>
          <label style={styles.label} htmlFor="passage-ref">
            Passage Reference
          </label>
          <input
            id="passage-ref"
            style={styles.input}
            type="text"
            placeholder="e.g. John 3:16 or Romans 8:1-4"
            value={ref}
            onChange={(e) => setRef(e.target.value)}
          />
        </div>
        <button style={styles.button} type="submit" disabled={loading}>
          {loading ? 'Loading…' : 'Read Passage'}
        </button>
      </form>

      {error && <p style={styles.error}>{error}</p>}

      {passage && (
        <div style={styles.scriptureBlock}>
          <div style={styles.referenceLabel}>{canonical} · ESV</div>
          {passage}
        </div>
      )}
    </div>
  )
}

function StudyBuilderTab() {
  const [ref, setRef] = useState('')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function runStudy(e) {
    e.preventDefault()
    if (!ref.trim()) return
    setLoading(true)
    setError('')
    setResult('')
    try {
      const res = await fetch('/api/study', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passage: ref.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Study request failed.')
      setResult(data.result)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.container}>
      <form onSubmit={runStudy}>
        <div style={styles.formGroup}>
          <label style={styles.label} htmlFor="study-ref">
            Passage Reference
          </label>
          <input
            id="study-ref"
            style={styles.input}
            type="text"
            placeholder="e.g. Psalm 23 or Matthew 5:1-12"
            value={ref}
            onChange={(e) => setRef(e.target.value)}
          />
        </div>
        <button style={styles.button} type="submit" disabled={loading}>
          {loading ? 'Building…' : 'Build Study'}
        </button>
      </form>

      {loading && <p style={styles.loading}>Generating study notes…</p>}
      {error && <p style={styles.error}>{error}</p>}

      {result && (
        <div style={styles.resultBlock}>
          <BadgedText text={result} />
        </div>
      )}
    </div>
  )
}

function AskClaudeTab() {
  const [passageCtx, setPassageCtx] = useState('')
  const [question, setQuestion] = useState('')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function askQuestion(e) {
    e.preventDefault()
    if (!question.trim()) return
    setLoading(true)
    setError('')
    setResult('')
    try {
      const res = await fetch('/api/study', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          passage: passageCtx.trim() || '(no specific passage)',
          question: question.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Request failed.')
      setResult(data.result)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.container}>
      <form onSubmit={askQuestion}>
        <div style={styles.formGroup}>
          <label style={styles.label} htmlFor="ctx-passage">
            Passage Context (optional)
          </label>
          <input
            id="ctx-passage"
            style={styles.input}
            type="text"
            placeholder="e.g. John 1:1-14"
            value={passageCtx}
            onChange={(e) => setPassageCtx(e.target.value)}
          />
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label} htmlFor="ask-question">
            Your Question
          </label>
          <textarea
            id="ask-question"
            style={styles.textarea}
            placeholder="e.g. What does 'the Word' mean in the original Greek?"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
        </div>
        <button style={styles.button} type="submit" disabled={loading}>
          {loading ? 'Asking…' : 'Ask Claude'}
        </button>
      </form>

      {loading && <p style={styles.loading}>Consulting the text…</p>}
      {error && <p style={styles.error}>{error}</p>}

      {result && (
        <div style={styles.resultBlock}>
          <BadgedText text={result} />
        </div>
      )}
    </div>
  )
}

const TABS = ['Reader', 'Study Builder', 'Ask Claude']

export default function Home() {
  const [activeTab, setActiveTab] = useState('Reader')

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <h1 style={styles.title}>Logos Anew</h1>
        <p style={styles.subtitle}>Scripture study with sourced, labeled commentary</p>
      </header>

      <nav style={styles.tabs}>
        {TABS.map((tab) => (
          <button
            key={tab}
            style={styles.tabButton(activeTab === tab)}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </nav>

      {activeTab === 'Reader' && <ReaderTab />}
      {activeTab === 'Study Builder' && <StudyBuilderTab />}
      {activeTab === 'Ask Claude' && <AskClaudeTab />}
    </div>
  )
}
