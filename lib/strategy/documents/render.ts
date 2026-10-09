// One renderer for an external document (Plan de sortie, Dossier de presse):
// the in-app preview (an iframe), the shared link and the PDF read the same
// HTML. Every value is escaped (it comes from people, calls and Deezer),
// URLs are http(s) only and the accent is a checked #rrggbb. The styles
// mirror docs/DESIGN.md (Google Sans Flex, medium minimum) because the app's
// tokens do not exist outside it. Client-safe.

import { fr } from "@/lib/i18n/fr";
import {
  accentSchema,
  DEFAULT_ACCENT,
  type Block,
  type DocImage,
  type DocPage,
  type ExternalDoc,
  type Theme,
} from "@/lib/strategy/documents/model";

export const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const safeUrl = (url: string) =>
  /^https?:\/\/[^\s"'<>]+$/i.test(url) ? escapeHtml(url) : null;

/** Light or dark ink on a colour, by its relative luminance. */
export function inkOn(hex: string): "#111111" | "#f5f5f5" {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.4 ? "#111111" : "#f5f5f5";
}

function palette(theme: Theme, accent: string) {
  if (theme === "night")
    return {
      bg: "#0e0e0e",
      ink: "#f2f2f2",
      muted: "#9b9b9b",
      line: "#2a2a2a",
      accent,
    };
  if (theme === "paper")
    return {
      bg: "#fbfaf7",
      ink: "#111111",
      muted: "#6f6f6f",
      line: "#e4e1da",
      accent,
    };
  const ink = inkOn(accent);
  return {
    bg: accent,
    ink,
    muted: ink === "#111111" ? "#3a3a3a" : "#d6d6d6",
    line: ink === "#111111" ? "#00000022" : "#ffffff33",
    accent: ink,
  };
}

const paragraphs = (text: string) =>
  text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${escapeHtml(p).replaceAll("\n", "<br>")}</p>`)
    .join("");

function image(img: DocImage, className = "") {
  const url = safeUrl(img.url);
  return url
    ? `<img class="${className}" src="${url}" alt="${escapeHtml(img.alt)}">`
    : "";
}

function block(b: Block): string {
  switch (b.type) {
    case "text":
      return `<div class="text">${paragraphs(b.text)}</div>`;
    case "entries":
      return `<div class="entries">${b.items
        .map(
          (i) =>
            `<div><p class="label">${escapeHtml(i.label)}</p>${paragraphs(i.text)}</div>`,
        )
        .join("")}</div>`;
    case "facts":
      return `<dl class="facts">${b.items
        .map(
          (f) =>
            `<div><dt>${escapeHtml(f.label)}</dt><dd>${escapeHtml(f.value)}</dd></div>`,
        )
        .join("")}</dl>`;
    case "list":
      return `<ul class="list">${b.items.map((i) => `<li>${escapeHtml(i)}</li>`).join("")}</ul>`;
    case "images":
      return `<div class="images n${Math.min(b.images.length, 4)}">${b.images
        .map((i) => image(i))
        .join("")}</div>`;
    case "palette":
      return `<div class="palette">${b.colors
        .filter((c) => accentSchema.safeParse(c).success)
        .map((c) => `<span style="background:${c}"><em>${c}</em></span>`)
        .join("")}</div>`;
    case "phases":
      return `<ol class="phases">${b.items
        .map(
          (p) =>
            `<li><p class="range">${escapeHtml(p.range)}</p><h3>${escapeHtml(p.name)}</h3>${
              p.lines.length
                ? `<ul>${p.lines.map((l) => `<li>${escapeHtml(l)}</li>`).join("")}</ul>`
                : ""
            }</li>`,
        )
        .join("")}</ol>`;
    case "timeline":
      return `<ol class="timeline">${b.items
        .map(
          (i) =>
            `<li><span class="when">${escapeHtml(i.when)}</span><span class="what"><strong>${escapeHtml(i.title)}</strong>${
              i.detail ? `<em>${escapeHtml(i.detail)}</em>` : ""
            }</span></li>`,
        )
        .join("")}</ol>`;
    case "links":
      return `<ul class="links">${b.items
        .flatMap((l) => {
          const url = safeUrl(l.url);
          return url
            ? [
                `<li><a href="${url}">${escapeHtml(l.label)}</a><span>${url}</span></li>`,
              ]
            : [];
        })
        .join("")}</ul>`;
  }
}

function page(p: DocPage, index: number, doc: ExternalDoc): string {
  if (p.key === "cover") {
    return `<section class="page cover">
  ${p.image ? `<div class="cover-image">${image(p.image)}</div>` : ""}
  <div class="cover-text">
    ${p.eyebrow ? `<p class="eyebrow">${escapeHtml(p.eyebrow)}</p>` : ""}
    <h1>${escapeHtml(p.title)}</h1>
    ${p.subtitle ? `<p class="subtitle">${escapeHtml(p.subtitle)}</p>` : ""}
  </div>
</section>`;
  }
  return `<section class="page">
  <header><span class="num">${String(index).padStart(2, "0")}</span><span>${escapeHtml(doc.project.title)} · ${escapeHtml(doc.project.artist)}</span></header>
  <h2>${escapeHtml(p.title)}</h2>
  ${p.blocks.map(block).join("")}
</section>`;
}

export function documentHtml(doc: ExternalDoc): string {
  const accent = accentSchema.safeParse(doc.accent).success
    ? doc.accent
    : DEFAULT_ACCENT;
  const c = palette(doc.theme, accent);
  const title = `${fr.strategyDocs.kinds[doc.kind]} · ${doc.project.title}`;
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${escapeHtml(title)}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Google+Sans+Flex:wght@500;600&display=block">
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { font-family: "Google Sans Flex", system-ui, sans-serif; font-weight: 500;
    color: ${c.ink}; letter-spacing: -0.02em; font-size: 15px; line-height: 22px; }
  .page { position: relative; width: 210mm; min-height: 297mm; padding: 22mm 20mm;
    background: ${c.bg}; overflow: hidden; break-after: page; display: flex;
    flex-direction: column; gap: 18px; }
  .page:last-child { break-after: auto; }
  header { display: flex; gap: 12px; font-size: 12px; line-height: 16px; color: ${c.muted};
    margin-bottom: 28px; }
  header .num { color: ${c.accent}; font-weight: 600; }
  h1 { font-size: 64px; line-height: 64px; font-weight: 600; letter-spacing: -0.05em; }
  h2 { font-size: 40px; line-height: 44px; font-weight: 600; letter-spacing: -0.04em;
    margin-bottom: 10px; }
  h3 { font-size: 20px; line-height: 26px; font-weight: 600; }
  .eyebrow { font-size: 13px; line-height: 18px; color: ${c.accent}; font-weight: 600;
    text-transform: uppercase; letter-spacing: 0.04em; }
  .subtitle { font-size: 22px; line-height: 30px; color: ${c.muted}; }
  .cover { padding: 0; justify-content: flex-end; }
  .cover-image { position: absolute; inset: 0 0 38% 0; }
  .cover-image img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .cover-text { position: relative; padding: 0 20mm 24mm; display: flex; flex-direction: column;
    gap: 14px; }
  .text { display: flex; flex-direction: column; gap: 12px; font-size: 17px; line-height: 26px;
    max-width: 150mm; }
  .entries { display: flex; flex-direction: column; gap: 20px; max-width: 160mm; }
  .entries .label { font-size: 12px; line-height: 16px; color: ${c.accent}; font-weight: 600;
    margin-bottom: 4px; }
  .entries p { font-size: 16px; line-height: 24px; }
  .facts { display: grid; grid-template-columns: 1fr 1fr; gap: 18px 32px; }
  .facts dt { font-size: 12px; line-height: 16px; color: ${c.muted}; }
  .facts dd { font-size: 17px; line-height: 24px; font-weight: 600; margin-top: 2px; }
  .list { list-style: none; display: flex; flex-direction: column; gap: 8px; }
  .list li { padding-left: 18px; position: relative; font-size: 16px; }
  .list li::before { content: ""; position: absolute; left: 0; top: 9px; width: 7px;
    height: 7px; border-radius: 50%; background: ${c.accent}; }
  .images { display: grid; gap: 8px; }
  .images.n1 { grid-template-columns: 1fr; }
  .images.n2 { grid-template-columns: 1fr 1fr; }
  .images.n3, .images.n4 { grid-template-columns: 1fr 1fr; }
  .images img { width: 100%; height: 100%; max-height: 120mm; object-fit: cover;
    display: block; border-radius: 6px; }
  .palette { display: flex; gap: 8px; }
  .palette span { flex: 1; height: 28mm; border-radius: 6px; display: flex;
    align-items: flex-end; padding: 8px; }
  .palette em { font-style: normal; font-size: 11px; color: ${c.ink};
    background: ${c.bg}; padding: 2px 6px; border-radius: 4px; }
  .phases { list-style: none; display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
  .phases > li { border: 1px solid ${c.line}; border-radius: 10px; padding: 14px;
    display: flex; flex-direction: column; gap: 8px; }
  .phases .range { font-size: 12px; color: ${c.accent}; font-weight: 600; }
  .phases ul { list-style: none; display: flex; flex-direction: column; gap: 4px;
    font-size: 13px; line-height: 18px; color: ${c.muted}; }
  .timeline { list-style: none; display: flex; flex-direction: column; gap: 10px; }
  .timeline li { display: grid; grid-template-columns: 34mm 1fr; gap: 12px; }
  .timeline .when { font-size: 13px; color: ${c.accent}; font-weight: 600; }
  .timeline .what { display: flex; flex-direction: column; }
  .timeline em { font-style: normal; font-size: 13px; color: ${c.muted}; }
  .links { list-style: none; display: flex; flex-direction: column; gap: 10px; }
  .links a { color: ${c.ink}; font-weight: 600; font-size: 17px; text-decoration: none; }
  .links span { display: block; font-size: 12px; color: ${c.muted}; word-break: break-all; }
  @media screen {
    body { background: #e8e8e8; padding: 24px 12px; }
    .page { margin: 0 auto 24px; max-width: 100%; box-shadow: 0 8px 30px #00000022;
      border-radius: 4px; }
  }
</style>
</head>
<body>
${doc.pages.map((p, i) => page(p, i, doc)).join("\n")}
</body>
</html>`;
}
