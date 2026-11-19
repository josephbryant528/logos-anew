'use client'

import { useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, X, Check } from "lucide-react";

const UI = "'Inter', system-ui, sans-serif";
const MAX_IMAGES = 4;
const MAX_SIDE = 1600;          // longest edge after shrinking, in pixels
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const NAME_KEY = "la_feedback_name";

type Picked = { id: string; file: File; preview: string };

// Phone screenshots and photos are often several MB; shrink them to a JPEG so
// a few fit in one request. Falls back to the original file if the browser
// can't decode it.
async function shrink(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

export default function FeedbackModal({ context, onClose }: { context: string; onClose: () => void }) {
  const [message, setMessage] = useState("");
  const [name, setName] = useState(() => {
    try { return localStorage.getItem(NAME_KEY) ?? ""; } catch { return ""; }
  });
  const [images, setImages] = useState<Picked[]>([]);
  const [preparing, setPreparing] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const previews = useRef<Set<string>>(new Set());

  // Free the preview URLs when the form closes.
  useEffect(() => {
    const urls = previews.current;
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, []);

  async function addFiles(list: FileList | null) {
    if (!list?.length) return;
    setError("");
    const room = MAX_IMAGES - images.length;
    const chosen = Array.from(list).filter((f) => f.type.startsWith("image/") || /\.(heic|heif)$/i.test(f.name));
    if (chosen.length > room) setError(`You can attach up to ${MAX_IMAGES} pictures.`);
    setPreparing(true);
    const added: Picked[] = [];
    for (const f of chosen.slice(0, room)) {
      const small = await shrink(f);
      if (small.size > MAX_IMAGE_BYTES) {
        setError("One of those pictures is too large to send.");
        continue;
      }
      const preview = URL.createObjectURL(small);
      previews.current.add(preview);
      added.push({ id: crypto.randomUUID(), file: small, preview });
    }
    setImages((prev) => [...prev, ...added]);
    setPreparing(false);
    if (fileInput.current) fileInput.current.value = "";
  }

  function removeImage(id: string) {
    setImages((prev) => {
      const gone = prev.find((p) => p.id === id);
      if (gone) {
        URL.revokeObjectURL(gone.preview);
        previews.current.delete(gone.preview);
      }
      return prev.filter((p) => p.id !== id);
    });
  }

  async function submit() {
    if (!message.trim() || sending) return;
    setSending(true);
    setError("");
    try {
      try { localStorage.setItem(NAME_KEY, name.trim()); } catch {}
      const form = new FormData();
      form.set("message", message.trim());
      form.set("name", name.trim());
      form.set("context", context);
      images.forEach((p) => form.append("images", p.file, p.file.name));
      const res = await fetch("/api/feedback", { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't send your feedback. Please try again.");
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't send your feedback. Please try again.");
    } finally {
      setSending(false);
    }
  }

  const label: React.CSSProperties = { display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--muted-foreground)", marginBottom: "6px" };
  const input: React.CSSProperties = { width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)", fontFamily: UI, fontSize: "16px" };

  return (
    <div role="dialog" aria-modal="true" aria-label="Send feedback"
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", padding: "calc(12px + env(safe-area-inset-top)) 12px calc(12px + env(safe-area-inset-bottom))" }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: "460px", maxHeight: "100%", overflowY: "auto", background: "var(--background)", color: "var(--foreground)", borderRadius: "12px", boxShadow: "0 12px 40px rgba(0,0,0,0.25)", fontFamily: UI, padding: "18px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
          <h2 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 600 }}>Send feedback</h2>
          <button onClick={onClose} aria-label="Close" style={{ border: "none", background: "transparent", cursor: "pointer", padding: "4px", display: "flex" }}>
            <X size={18} style={{ color: "var(--muted-foreground)" }} />
          </button>
        </div>

        {sent ? (
          <div style={{ textAlign: "center", padding: "24px 8px" }}>
            <div style={{ width: "44px", height: "44px", borderRadius: "50%", background: "rgba(46,170,220,0.12)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
              <Check size={22} style={{ color: "var(--accent)" }} />
            </div>
            <p style={{ margin: "0 0 18px", fontSize: "0.95rem" }}>Thank you. Your feedback was sent.</p>
            <button onClick={onClose} style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid var(--border)", background: "transparent", color: "var(--foreground)", fontFamily: UI, fontSize: "0.9rem", cursor: "pointer" }}>Done</button>
          </div>
        ) : (
          <>
            <p style={{ margin: "0 0 14px", fontSize: "0.85rem", color: "var(--muted-foreground)", lineHeight: 1.5 }}>
              Tell us what you noticed or what you&apos;d like to see. Screenshots help.
            </p>

            <label style={label} htmlFor="fb-message">Your feedback</label>
            <textarea id="fb-message" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={5000} rows={5}
              placeholder="What happened, or what would make this better?"
              style={{ ...input, resize: "vertical", lineHeight: 1.5, marginBottom: "14px" }} />

            <label style={label} htmlFor="fb-name">Your name (optional)</label>
            <input id="fb-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoComplete="name"
              style={{ ...input, marginBottom: "14px" }} />

            <span style={label}>Screenshots (optional, up to {MAX_IMAGES})</span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "14px" }}>
              {images.map((p) => (
                <div key={p.id} style={{ position: "relative", width: "72px", height: "72px" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.preview} alt="Attached screenshot" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "8px", border: "1px solid var(--border)" }} />
                  <button onClick={() => removeImage(p.id)} aria-label="Remove picture"
                    style={{ position: "absolute", top: "-6px", right: "-6px", width: "22px", height: "22px", borderRadius: "50%", border: "none", background: "var(--foreground)", color: "var(--background)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0 }}>
                    <X size={12} />
                  </button>
                </div>
              ))}
              {images.length < MAX_IMAGES && (
                <button onClick={() => fileInput.current?.click()} disabled={preparing}
                  style={{ width: "72px", height: "72px", borderRadius: "8px", border: "1px dashed var(--border)", background: "transparent", color: "var(--muted-foreground)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "4px", cursor: "pointer", fontFamily: UI, fontSize: "0.7rem" }}>
                  {preparing ? <Loader2 size={18} className="animate-spin" /> : <ImagePlus size={18} />}
                  {preparing ? "Adding" : "Add"}
                </button>
              )}
              <input ref={fileInput} type="file" accept="image/*" multiple hidden onChange={(e) => addFiles(e.target.files)} />
            </div>

            {context && (
              <p style={{ margin: "0 0 14px", fontSize: "0.75rem", color: "var(--muted-foreground)" }}>
                We&apos;ll note you were on: {context}
              </p>
            )}

            {error && <p role="alert" style={{ margin: "0 0 12px", fontSize: "0.85rem", color: "#c0392b" }}>{error}</p>}

            <button onClick={submit} disabled={!message.trim() || sending || preparing}
              style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "none", background: "var(--foreground)", color: "var(--background)", fontFamily: UI, fontSize: "0.95rem", fontWeight: 600, cursor: message.trim() && !sending ? "pointer" : "default", opacity: !message.trim() || sending || preparing ? 0.5 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
              {sending && <Loader2 size={16} className="animate-spin" />}
              {sending ? "Sending" : "Send feedback"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
