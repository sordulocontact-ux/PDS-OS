/**
 * The app's two styles while Ibé decides (Sacha, 16/11/2026,
 * docs/STYLE-FINANCE-PARTOUT.md § 13): the new one, Finance's (after
 * Midday), drawn by default, and the classic one, the app as it was until
 * 16/11/2026, kept whole behind a switch in Réglages until it is validated
 * or dropped. A display preference of one browser, never business data: a
 * cookie, read by the root layout on the server, which marks
 * `<html data-style="classic">` in the HTML itself (no script: React 19.2
 * warned on the inline one, 20/11/2026). Everything that differs reads that mark:
 * the tokens (app/globals.css, `:root[data-style="classic"]`), the
 * Tailwind variants `classic:` and `modern:`, and `useDesignStyle()`.
 */
export type DesignStyle = "modern" | "classic";

export const DESIGN_STYLE_COOKIE = "pds-style";

// A year: a choice one makes once, to compare.
export const DESIGN_STYLE_MAX_AGE = 60 * 60 * 24 * 365;

/** The style a request asks for, from its cookie: `data-style` on <html>
 * for the classic one, nothing for the new one. */
export const designStyleAttribute = (cookie: string | undefined) =>
  cookie === "classic" ? "classic" : undefined;
