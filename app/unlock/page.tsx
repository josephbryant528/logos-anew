"use client";

import { useState } from "react";
import { BookOpen } from "lucide-react";

function safeNext(): string {
  if (typeof window === "undefined") return "/";
  const next = new URLSearchParams(window.location.search).get("next") ?? "/";
  return next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export default function UnlockPage() {
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!passcode || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode }),
      });
      if (res.ok) {
        window.location.replace(safeNext());
        return;
      }
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong. Try again.");
    } catch {
      setError("Couldn't reach the app. Check your connection.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", background: "var(--background)", color: "var(--foreground)", fontFamily: "'Inter', system-ui, sans-serif" }}>
      <form onSubmit={submit} style={{ width: "100%", maxWidth: "320px", display: "flex", flexDirection: "column", gap: "14px", alignItems: "stretch" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
          <BookOpen size={28} style={{ color: "var(--accent)" }} />
          <h1 style={{ fontSize: "1.25rem", fontWeight: 600, margin: 0 }}>Logos Anew</h1>
          <p style={{ fontSize: "0.875rem", color: "var(--muted-foreground)", margin: 0 }}>Enter your passcode to continue</p>
        </div>
        <input
          type="password"
          inputMode="text"
          autoComplete="current-password"
          autoFocus
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
          aria-label="Passcode"
          style={{ fontSize: "16px", padding: "12px 14px", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--input-background)", color: "var(--foreground)", outline: "none" }}
        />
        {error && <p role="alert" style={{ fontSize: "0.8rem", color: "var(--destructive)", margin: 0 }}>{error}</p>}
        <button
          type="submit"
          disabled={busy || !passcode}
          style={{ fontSize: "1rem", fontWeight: 500, padding: "12px", borderRadius: "8px", border: "none", background: "var(--primary)", color: "var(--primary-foreground)", cursor: "pointer", opacity: busy || !passcode ? 0.6 : 1 }}
        >
          {busy ? "Checking…" : "Unlock"}
        </button>
      </form>
    </main>
  );
}
