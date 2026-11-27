// A text pasted from Word (or a web page) into a contract template keeps its
// bold and underline as the template's marks (Sacha 22/11/2026): « **…** »
// bold, « __…__ » underlined, the rest plain text. Client-side (DOMParser).

export const isBold = (el: HTMLElement) =>
  el.tagName === "B" ||
  el.tagName === "STRONG" ||
  /font-weight:\s*(bold|[6-9]00)/i.test(el.getAttribute("style") ?? "");

export const isUnderline = (el: HTMLElement) =>
  el.tagName === "U" ||
  /text-decoration[^;]*underline/i.test(el.getAttribute("style") ?? "");

const BLOCKS = new Set(["P", "DIV", "LI", "H1", "H2", "H3", "H4", "TR"]);

/** The pasted HTML as text with its marks; null when there is none. */
export function markedTextOf(html: string): string | null {
  if (!html.trim()) return null;
  const doc = new DOMParser().parseFromString(html, "text/html");
  const walk = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE)
      return (node.textContent ?? "").replace(/\s+/g, " ");
    if (!(node instanceof HTMLElement)) return "";
    if (node.tagName === "BR") return "\n";
    if (node.tagName === "STYLE" || node.tagName === "SCRIPT") return "";
    let inner = [...node.childNodes].map(walk).join("");
    const trimmed = inner.trim();
    if (trimmed && !BLOCKS.has(node.tagName)) {
      const lead = inner.slice(0, inner.indexOf(trimmed));
      const tail = inner.slice(inner.indexOf(trimmed) + trimmed.length);
      let core = trimmed;
      if (isUnderline(node) && !/^__.*__$/.test(core)) core = `__${core}__`;
      if (isBold(node) && !/^\*\*.*\*\*$/.test(core)) core = `**${core}**`;
      inner = lead + core + tail;
    }
    return BLOCKS.has(node.tagName) ? `${inner.trim()}\n\n` : inner;
  };
  const text = walk(doc.body)
    .replace(/\*\*\*\*/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return text || null;
}

/** The typeface most of a text pasted from Word or a page is written in
 * (Sacha 25/11/2026, « récupérer la typo du contrat »): the first family of
 * each `font-family`, counted by the characters it styles; null when none. */
export function pastedFontOf(html: string): string | null {
  if (!html.trim()) return null;
  const doc = new DOMParser().parseFromString(html, "text/html");
  const count = new Map<string, number>();
  const walk = (node: Node, font: string | null) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const length = (node.textContent ?? "").trim().length;
      if (font && length) count.set(font, (count.get(font) ?? 0) + length);
      return;
    }
    if (!(node instanceof HTMLElement)) return;
    if (node.tagName === "STYLE" || node.tagName === "SCRIPT") return;
    const own = node.style.fontFamily
      .split(",")[0]
      ?.trim()
      .replace(/^["']|["']$/g, "");
    for (const child of node.childNodes) walk(child, own || font);
  };
  walk(doc.body, null);
  return [...count].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}
