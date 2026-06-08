'use client'

import { useState, useRef, useEffect } from "react";
import { X, CheckCircle2 } from "lucide-react";
import { loadPrayers, savePrayers, uid } from "../data/prayer";
import { Modal, inputStyle, primaryBtn, secondaryBtn } from "./ReadingLogModal";

const UI   = "'Inter', system-ui, sans-serif";
const BODY = "'Lora', serif";
const MONO = "'DM Mono', monospace";

interface Props {
  onClose: () => void;
  onViewPrayerLog?: () => void;
}

export function PrayerQuickModal({ onClose, onViewPrayerLog }: Props) {
  const [title,    setTitle]    = useState("");
  const [desc,     setDesc]     = useState("");
  const [saved,    setSaved]    = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => { titleRef.current?.focus(); }, []);

  const canSave = title.trim().length > 0;

  const handleSave = () => {
    if (!canSave) return;
    const prayers = loadPrayers();
    prayers.unshift({
      id: uid(), title: title.trim(), description: desc.trim(),
      createdAt: new Date().toISOString(), answered: false, notes: [],
    });
    savePrayers(prayers);
    setSaved(true);
  };

  return (
    <Modal onClose={onClose} width="440px">
      {saved ? (
        /* ── Success state ── */
        <div style={{ textAlign: "center", padding: "12px 0" }}>
          <CheckCircle2 size={40} style={{ color: "var(--accent)", marginBottom: "12px" }} />
          <h2 style={{ fontFamily: UI, fontSize: "1rem", fontWeight: 700, color: "var(--foreground)", margin: "0 0 6px" }}>
            Added to Prayer Log
          </h2>
          <p style={{ fontFamily: BODY, fontSize: "0.875rem", color: "var(--muted-foreground)", margin: "0 0 20px", lineHeight: 1.6 }}>
            &ldquo;{title.trim()}&rdquo; has been added. You can track updates and mark it answered in the Prayer Log.
          </p>
          <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
            <button onClick={onClose} style={secondaryBtn}>Done</button>
            {onViewPrayerLog && (
              <button onClick={() => { onClose(); onViewPrayerLog(); }} style={primaryBtn}>
                View Prayer Log
              </button>
            )}
          </div>
        </div>
      ) : (
        /* ── Form state ── */
        <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
            <div>
              <div style={{ fontFamily: MONO, fontSize: "0.62rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--accent)", marginBottom: "4px" }}>New Prayer Request</div>
              <h2 style={{ fontFamily: UI, fontSize: "1.1rem", fontWeight: 700, color: "var(--foreground)", margin: 0 }}>What are you bringing to God?</h2>
            </div>
            <button onClick={onClose} style={{ padding: "4px", borderRadius: "4px", border: "none", background: "transparent", cursor: "pointer", color: "var(--muted-foreground)", display: "flex" }}><X size={16} /></button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontFamily: UI, fontSize: "0.78rem", fontWeight: 500, color: "var(--muted-foreground)", marginBottom: "5px" }}>Request</label>
              <input
                ref={titleRef}
                value={title}
                onChange={e => setTitle(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && canSave) handleSave(); }}
                placeholder="What are you praying for?"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ display: "block", fontFamily: UI, fontSize: "0.78rem", fontWeight: 500, color: "var(--muted-foreground)", marginBottom: "5px" }}>Context <span style={{ fontWeight: 400 }}>(optional)</span></label>
              <textarea
                value={desc}
                onChange={e => setDesc(e.target.value)}
                placeholder="Background, specifics, or initial thoughts…"
                rows={3}
                style={{ ...inputStyle, resize: "vertical", minHeight: "68px", fontFamily: BODY, fontSize: "0.875rem", lineHeight: 1.6, boxSizing: "border-box" } as React.CSSProperties}
              />
            </div>
          </div>

          <p style={{ fontFamily: BODY, fontSize: "0.78rem", color: "var(--muted-foreground)", fontStyle: "italic", margin: "12px 0 20px", lineHeight: 1.55 }}>
            This will be added to your Prayer Log where you can track it, add notes, and mark it answered over time.
          </p>

          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
            <button onClick={onClose} style={secondaryBtn}>Cancel</button>
            <button onClick={handleSave} disabled={!canSave}
              style={{ ...primaryBtn, opacity: canSave ? 1 : 0.45, cursor: canSave ? "pointer" : "default" }}>
              Add to Prayer Log
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
