import { UI } from "../../ui/tokens";

// Crossway requires this notice, the letters "ESV" and a link to esv.org on every page that shows ESV text.
export function EsvNotice({ padded }: { padded: boolean }) {
  return (
    <footer style={{ marginTop: "40px", padding: padded ? "16px 8px 0" : "16px 0 0", borderTop: "1px solid var(--border)", fontFamily: UI, fontSize: "0.75rem", lineHeight: 1.6, color: "var(--muted-foreground)" }}>
      <p style={{ margin: 0 }}>
        Scripture quotations are from the ESV® Bible (The Holy Bible, English Standard Version®), © 2001 by Crossway, a publishing ministry of Good News Publishers. ESV Text Edition: 2025. The ESV text may not be quoted in any publication made available to the public by a Creative Commons license. The ESV may not be translated in whole or in part into any other language. Used by permission. All rights reserved.
      </p>
      <p style={{ margin: "8px 0 0" }}>
        <a href="https://www.esv.org" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent-text)", textDecoration: "underline", textUnderlineOffset: "2px", display: "inline-block", padding: "12px 0" }}>Read the ESV at esv.org</a>
      </p>
    </footer>
  );
}
