'use client'

import { UI, canHover, iconBtn } from "./tokens";

export function NavBtn({ onClick, disabled, label, children }: { onClick: () => void; disabled?: boolean; label: string; children: React.ReactNode }) {
  return (
    <button onClick={onClick} disabled={disabled} aria-label={label} title={label} style={{ ...iconBtn, opacity: disabled ? 0.3 : 1, cursor: disabled ? "default" : "pointer", color: "var(--muted-foreground)" }}
      onMouseEnter={e => { if (!canHover()) return; if (!disabled) e.currentTarget.style.background = "var(--muted)"; }}
      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
    >{children}</button>
  );
}

export function Chip({ children }: { children: React.ReactNode }) {
  return <span style={{ fontFamily: UI, fontSize: "0.75rem", padding: "1px 6px", borderRadius: "4px", background: "var(--border)", color: "var(--muted-foreground)", whiteSpace: "nowrap" }}>{children}</span>;
}
