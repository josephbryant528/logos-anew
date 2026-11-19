'use client'

import { useState, useEffect, useRef } from "react";
import { type ScriptureVerse } from "../../data/scripture";
import { Send } from "lucide-react";
import { UI, BODY, TAP, canHover } from "../../ui/tokens";

// Renders inline markdown: **bold**, *italic*, [SCRIPTURE/COMMENTARY:x] badges
export function InlineText({ text }: { text: string }) {
  // Split on bold (**...**), italic (*...*), and badges
  const tokens: React.ReactNode[] = [];
  const re = /\*\*([^*]+)\*\*|\*([^*]+)\*|\[SCRIPTURE:([^\]]+)\]|\[COMMENTARY:([^\]]+)\]/g;
  let last = 0, m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) tokens.push(text.slice(last, m.index));
    if (m[1] !== undefined) tokens.push(<strong key={m.index}>{m[1]}</strong>);
    else if (m[2] !== undefined) tokens.push(<em key={m.index}>{m[2]}</em>);
    else if (m[3] !== undefined) tokens.push(
      <span key={m.index} style={{ display: "inline-block", background: "var(--badge-scripture-bg)", border: "1px solid var(--badge-scripture-border)", color: "var(--badge-scripture-fg)", borderRadius: "3px", padding: "0 0.4em", fontSize: "0.82em", fontWeight: 600, margin: "0 0.1em", verticalAlign: "middle" }}>{m[3]}</span>
    );
    else if (m[4] !== undefined) tokens.push(
      <span key={m.index} style={{ display: "inline-block", background: "var(--badge-commentary-bg)", border: "1px solid var(--badge-commentary-border)", color: "var(--badge-commentary-fg)", borderRadius: "3px", padding: "0 0.4em", fontSize: "0.82em", fontWeight: 600, margin: "0 0.1em", verticalAlign: "middle" }}>{m[4]}</span>
    );
    last = re.lastIndex;
  }
  if (last < text.length) tokens.push(text.slice(last));
  return <>{tokens}</>;
}

// Renders a full markdown AI response: headings, bullets, horizontal rules, bold/italic
export function MarkdownText({ text }: { text: string }) {
  const lines = text.split('\n');
  const nodes: React.ReactNode[] = [];
  let listItems: string[] = [];

  function flushList() {
    if (listItems.length === 0) return;
    nodes.push(
      <ul key={nodes.length} style={{ margin: "4px 0 8px", paddingLeft: "18px", display: "flex", flexDirection: "column", gap: "2px" }}>
        {listItems.map((li, i) => (
          <li key={i} style={{ lineHeight: 1.65 }}><InlineText text={li} /></li>
        ))}
      </ul>
    );
    listItems = [];
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Horizontal rule
    if (/^---+$/.test(trimmed)) {
      flushList();
      nodes.push(<hr key={nodes.length} style={{ border: "none", borderTop: "1px solid var(--border)", margin: "10px 0" }} />);
      continue;
    }

    // Headings
    const h3 = trimmed.match(/^###\s+(.+)/);
    const h2 = trimmed.match(/^##\s+(.+)/);
    const h1 = trimmed.match(/^#\s+(.+)/);
    if (h1 || h2 || h3) {
      flushList();
      const content = (h1 || h2 || h3)![1];
      const size = h1 ? "1rem" : h2 ? "0.9rem" : "0.85rem";
      const mt   = h1 ? "14px" : "10px";
      nodes.push(
        <p key={nodes.length} style={{ fontFamily: UI, fontWeight: 700, fontSize: size, color: "var(--foreground)", margin: `${mt} 0 4px` }}>
          <InlineText text={content} />
        </p>
      );
      continue;
    }

    // Bullet list items (-, *, •)
    const bullet = trimmed.match(/^[-*•]\s+(.+)/);
    if (bullet) {
      listItems.push(bullet[1]);
      continue;
    }

    // Blank line
    if (!trimmed) {
      flushList();
      continue;
    }

    // Normal paragraph line
    flushList();
    nodes.push(
      <p key={nodes.length} style={{ margin: "0 0 6px", lineHeight: 1.75 }}>
        <InlineText text={trimmed} />
      </p>
    );
  }
  flushList();
  return <div style={{ fontFamily: BODY, fontSize: "0.875rem", color: "var(--foreground)" }}>{nodes}</div>;
}

export interface ChatMessage { role: "user" | "assistant"; content: string }

export const SUGGESTED_PROMPTS = [
  "Give me a brief overview of this passage.",
  "What are the key theological themes here?",
  "Explain the historical and cultural context.",
  "What does this passage teach about God's character?",
]

export function AIStudyTab({ verse, verseKey }: { verse: ScriptureVerse; verseKey: string }) {
  const [messages,  setMessages]  = useState<ChatMessage[]>([]);
  const [input,     setInput]     = useState("");
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);

  // Reset conversation when the verse changes
  const prevVerseKey = useRef(verseKey);
  if (prevVerseKey.current !== verseKey) {
    prevVerseKey.current = verseKey;
    // Can't call setMessages directly during render, use an effect below
  }
  useEffect(() => {
    setMessages([]);
    setInput("");
    setError("");
  }, [verseKey]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setInput("");
    setError("");
    const userMsg: ChatMessage = { role: "user", content: trimmed };
    const next = [...messages, userMsg];
    setMessages(next);
    setLoading(true);
    try {
      const res = await fetch("/api/study", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ passage: verseKey, messages: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed.");
      setMessages(prev => [...prev, { role: "assistant", content: data.result }]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Request failed.");
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  const empty = messages.length === 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, height: "100%", overflow: "hidden" }}>
      {/* Messages area */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "16px" }}>
        {empty && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <p style={{ fontFamily: UI, fontSize: "0.85rem", color: "var(--muted-foreground)", lineHeight: 1.6, margin: 0 }}>
              Ask anything about <strong style={{ color: "var(--foreground)" }}>{verseKey}</strong> — context, themes, language, theology.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {SUGGESTED_PROMPTS.map(p => (
                <button key={p} onClick={() => send(p)}
                  style={{ textAlign: "left", minHeight: `${TAP}px`, padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--border)", background: "transparent", cursor: "pointer", fontFamily: UI, fontSize: "0.875rem", color: "var(--muted-foreground)", lineHeight: 1.5 }}
                  onMouseEnter={e => { if (canHover()) e.currentTarget.style.background = "var(--muted)"; }}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >{p}</button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", gap: "2px", alignItems: m.role === "user" ? "flex-end" : "flex-start" }}>
            <span style={{ fontFamily: UI, fontSize: "0.75rem", color: "var(--muted-foreground)", marginBottom: "2px" }}>
              {m.role === "user" ? "You" : "AI Study"}
            </span>
            <div style={{
              maxWidth: "90%",
              padding: "10px 13px",
              borderRadius: m.role === "user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
              background: m.role === "user" ? "var(--foreground)" : "var(--muted)",
              color:      m.role === "user" ? "var(--background)" : "var(--foreground)",
              fontFamily: BODY,
              fontSize:   "0.875rem",
              lineHeight: 1.75,
              whiteSpace: "pre-wrap",
            }}>
              {m.role === "assistant" ? <MarkdownText text={m.content} /> : m.content}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontFamily: UI, fontSize: "0.75rem", color: "var(--muted-foreground)" }}>AI Study</span>
            <div style={{ display: "flex", gap: "3px", paddingLeft: "4px" }}>
              {[0,1,2].map(i => (
                <span key={i} style={{ width: "5px", height: "5px", borderRadius: "50%", background: "var(--muted-foreground)", opacity: 0.5, animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />
              ))}
            </div>
          </div>
        )}

        {error && (
          <p style={{ fontFamily: UI, fontSize: "0.8rem", color: "var(--destructive)", margin: 0 }}>{error}</p>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: "8px", padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--background)" }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => { setInput(e.target.value); e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px"; }}
            onKeyDown={handleKey}
            placeholder={`Ask about ${verseKey}…`}
            aria-label={`Ask about ${verseKey}`}
            enterKeyHint="send"
            rows={1}
            style={{ flex: 1, resize: "none", border: "none", outline: "none", background: "transparent", fontFamily: UI, fontSize: "16px", color: "var(--foreground)", lineHeight: 1.5, maxHeight: "120px", overflow: "auto" }}
          />
          <button
            onClick={() => send(input)}
            disabled={!input.trim() || loading}
            aria-label="Send" style={{ flexShrink: 0, width: "36px", height: "36px", margin: "-4px -6px -4px 0", borderRadius: "8px", border: "none", background: input.trim() && !loading ? "var(--foreground)" : "transparent", cursor: input.trim() && !loading ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.15s" }}
          >
            <Send size={16} style={{ color: input.trim() && !loading ? "var(--background)" : "var(--muted-foreground)" }} />
          </button>
        </div>
        <p style={{ fontFamily: UI, fontSize: "0.75rem", color: "var(--muted-foreground)", margin: "6px 0 0", textAlign: "center" }}>
          <span className="kbd-hint">Shift+Enter for new line · Enter to send · </span>20 messages an hour
        </p>
      </div>
    </div>
  );
}
