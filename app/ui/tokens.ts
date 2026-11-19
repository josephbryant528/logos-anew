// Type families. Each points at the CSS variable next/font sets in layout.tsx.
export const UI   = "var(--font-inter), system-ui, sans-serif";
export const BODY = "var(--font-lora), Georgia, serif";
export const MONO = "var(--font-dm-mono), ui-monospace, monospace";
export const HE   = "var(--font-noto-serif-hebrew), var(--font-noto-serif), serif";
export const GR   = "var(--font-noto-serif), serif";

// Top bar height. Phone controls are at least 44px so they are easy to tap.
export const HEADER_H = 48;

export const TAP = 44;

// Touch screens fire mouseenter on tap and never fire mouseleave, which leaves hover colours stuck.
export const canHover = () => typeof window !== "undefined" && window.matchMedia("(hover: hover)").matches;

export const chapterStepBtn: React.CSSProperties = { flex: 1, maxWidth: "50%", minHeight: `${TAP}px`, display: "flex", alignItems: "center", gap: "6px", padding: "10px 14px", borderRadius: "8px", border: "1px solid var(--border)", background: "transparent", cursor: "pointer", fontFamily: UI, fontSize: "0.875rem", color: "var(--foreground)" };
export const backBtnStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: "4px", padding: "4px 12px", border: "none", background: "transparent", cursor: "pointer", fontFamily: UI, fontSize: "0.8rem", color: "var(--muted-foreground)" };
export const iconBtn: React.CSSProperties = { minWidth: `${TAP}px`, minHeight: `${TAP}px`, padding: "0 10px", borderRadius: "8px", background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px", flexShrink: 0 };
