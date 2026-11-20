"use client";

/**
 * The `type` of a script that must run before the first paint (the entry
 * splash, the light or dark theme). Run from the server's HTML, it is
 * JavaScript; drawn again by React on the client (the root re-created, in
 * development or after a root error), it is a data block: React 19.2 warns
 * on a script it creates (« Encountered a script tag while rendering React
 * component »), which would never run anyway, and the page is already set.
 * The element carries `suppressHydrationWarning`: the type differs from the
 * server's on purpose, and React keeps the server's at hydration.
 */
export const beforePaintScriptType = () =>
  typeof window === "undefined" ? "text/javascript" : "text/plain";

/** An inline script run before the first paint (see above). */
export function BeforePaintScript({ code }: { code: string }) {
  return (
    <script
      suppressHydrationWarning
      type={beforePaintScriptType()}
      dangerouslySetInnerHTML={{ __html: code }}
    />
  );
}
