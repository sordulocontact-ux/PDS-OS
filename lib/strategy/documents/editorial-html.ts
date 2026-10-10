// The one renderer of the external documents (Plan de sortie, Dossier de
// presse): the in-app preview (a sandboxed iframe), the shared link
// (/d/[token]) and the PDF read the same HTML. Editorial and page by page
// (A4), in the direction the owner validated: its colours, its typographic
// pairing (Google Fonts only), a full-bleed cover. Every value is escaped
// (it comes from people and calls), URLs are https only, colours are checked
// #rrggbb. No script, no budget. Client-safe.

import {
  directionSchema,
  FONT_PAIRINGS,
  proposeDirection,
  shadesOf,
  type Direction,
} from "@/lib/strategy/documents/direction";
import type {
  Block,
  DocImage,
  DocPage,
  ReleasePlanContent,
} from "@/lib/strategy/documents/release-plan-model";

/** What every external document has: its project, direction and pages. */
export type EditorialContent = Pick<
  ReleasePlanContent,
  "project" | "direction" | "pages"
>;

export const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const safeUrl = (url: string) =>
  /^https:\/\/[^\s"'<>]+$/i.test(url) ||
  /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?\/[^\s"'<>]*$/i.test(url)
    ? escapeHtml(url)
    : null;
const isHex = (value: string) => /^#[0-9a-f]{6}$/i.test(value);

const paragraphs = (text: string) =>
  text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${escapeHtml(p).replaceAll("\n", "<br>")}</p>`)
    .join("");

function image(img: DocImage) {
  const url = safeUrl(img.url);
  return url ? `<img src="${url}" alt="${escapeHtml(img.alt)}">` : "";
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
    case "links":
      return `<ul class="links">${b.items
        .map((l) => {
          const url = safeUrl(l.url);
          return url
            ? `<li><span class="label">${escapeHtml(l.label)}</span><a href="${url}">${escapeHtml(l.url)}</a></li>`
            : "";
        })
        .join("")}</ul>`;
    case "groups":
      return `<div class="groups">${b.items
        .map(
          (g) =>
            `<div><p class="label">${escapeHtml(g.label)}</p><ul class="list">${g.lines
              .map((l) => `<li>${escapeHtml(l)}</li>`)
              .join("")}</ul></div>`,
        )
        .join("")}</div>`;
    case "images":
      return `<div class="images n${Math.min(b.images.length, 4)}">${b.images
        .map(image)
        .join("")}</div>`;
    case "palette":
      return `<div class="palette">${b.colors
        .filter(isHex)
        .map((c) => `<span style="background:${c}"><em>${c}</em></span>`)
        .join("")}</div>`;
    case "phases":
      return `<ol class="phases">${b.items
        .map(
          (p, i) =>
            `<li><p class="range">${String(i + 1).padStart(2, "0")} · ${escapeHtml(p.range)}</p><h3>${escapeHtml(p.name)}</h3>${
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
  }
}

function page(p: DocPage, index: number, doc: EditorialContent): string {
  if (p.key === "cover") {
    return `<section class="page cover${p.image ? " with-image" : ""}">
  ${p.image ? `<div class="cover-image">${image(p.image)}</div>` : ""}
  <div class="cover-text">
    ${p.eyebrow ? `<p class="eyebrow">${escapeHtml(p.eyebrow)}</p>` : ""}
    <h1>${escapeHtml(p.title)}</h1>
    ${p.subtitle ? `<p class="subtitle">${escapeHtml(p.subtitle)}</p>` : ""}
  </div>
</section>`;
  }
  return `<section class="page">
  <header><span class="num">${String(index).padStart(2, "0")}</span><span>${escapeHtml(doc.project.title)}${doc.project.artist ? ` · ${escapeHtml(doc.project.artist)}` : ""}</span></header>
  <h2>${escapeHtml(p.title)}</h2>
  ${p.blocks.map(block).join("")}
</section>`;
}

const fontParam = (family: string) =>
  `family=${family.replaceAll(" ", "+")}:wght@400;700`;

/** A whole document, `title` naming it in the browser and the PDF. */
export function editorialHtml(
  content: EditorialContent,
  title: string,
): string {
  const d: Direction = directionSchema.safeParse(content.direction).success
    ? content.direction
    : proposeDirection({ palette: [], lightness: null, saturation: null }, 0);
  const { muted, line } = shadesOf(d);
  const fonts = FONT_PAIRINGS[d.fonts];
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${escapeHtml(title)}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?${fontParam(fonts.heading)}&${fontParam(fonts.body)}&display=block">
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { font-family: "${fonts.body}", system-ui, sans-serif; font-weight: 400;
    color: ${d.ink}; font-size: 15px; line-height: 23px; }
  h1, h2, h3, .eyebrow, .label, .num, .range, .when { font-family: "${fonts.heading}", system-ui, sans-serif; }
  .page { position: relative; width: 210mm; height: 297mm; padding: 22mm 20mm;
    background: ${d.background}; overflow: hidden; break-after: page; display: flex;
    flex-direction: column; gap: 18px; }
  .page:last-child { break-after: auto; }
  header { display: flex; gap: 12px; font-size: 11px; line-height: 16px; color: ${muted};
    text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 36px; }
  header .num { color: ${d.accent}; font-weight: 700; }
  h1 { font-size: 76px; line-height: 0.95; font-weight: 700; letter-spacing: -0.04em; }
  h2 { font-size: 46px; line-height: 1; font-weight: 700; letter-spacing: -0.03em;
    margin-bottom: 18px; max-width: 150mm; }
  h3 { font-size: 22px; line-height: 26px; font-weight: 600; }
  .eyebrow { font-size: 12px; line-height: 16px; color: ${d.accent}; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.12em; }
  .subtitle { font-size: 22px; line-height: 30px; color: ${muted}; }
  .cover { padding: 0; justify-content: flex-end; }
  .cover .eyebrow, .cover h1, .cover .subtitle { position: relative; }
  .cover-image { position: absolute; inset: 0; }
  .cover-image img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .cover.with-image .cover-image::after { content: ""; position: absolute; inset: 40% 0 0 0;
    background: linear-gradient(to bottom, transparent, ${d.background}); }
  .cover-text { position: relative; padding: 0 20mm 26mm; display: flex; flex-direction: column;
    gap: 16px; }
  .text { display: flex; flex-direction: column; gap: 14px; font-size: 19px; line-height: 29px;
    max-width: 150mm; }
  .entries { display: grid; grid-template-columns: 1fr 1fr; gap: 26px 28px; }
  .entries .label, .groups .label { font-size: 11px; line-height: 16px; color: ${d.accent};
    font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 6px; }
  .entries p { font-size: 16px; line-height: 24px; }
  .facts { display: grid; grid-template-columns: 1fr 1fr; gap: 22px 32px; border-top: 2px solid ${d.accent};
    padding-top: 20px; }
  .facts dt { font-size: 11px; line-height: 16px; color: ${muted}; text-transform: uppercase;
    letter-spacing: 0.08em; }
  .facts dd { font-size: 22px; line-height: 28px; font-weight: 600; margin-top: 4px; }
  .groups { display: grid; grid-template-columns: 1fr 1fr; gap: 24px 28px; }
  .list { list-style: none; display: flex; flex-direction: column; gap: 10px; }
  .list li { padding-left: 20px; position: relative; font-size: 17px; line-height: 24px; }
  .list li::before { content: ""; position: absolute; left: 0; top: 9px; width: 8px;
    height: 8px; border-radius: 50%; background: ${d.accent}; }
  .images { display: grid; gap: 8px; flex: 1; min-height: 0; }
  .images.n1 { grid-template-columns: 1fr; }
  .images.n2 { grid-template-columns: 1fr 1fr; }
  .images.n3, .images.n4 { grid-template-columns: 1fr 1fr; grid-auto-rows: 1fr; }
  .images img { width: 100%; height: 100%; max-height: 150mm; object-fit: cover;
    display: block; border-radius: 4px; }
  .palette { display: flex; gap: 8px; }
  .palette span { flex: 1; height: 26mm; border-radius: 4px; display: flex;
    align-items: flex-end; padding: 8px; border: 1px solid ${line}; }
  .palette em { font-style: normal; font-size: 10px; color: ${d.ink};
    background: ${d.background}; padding: 2px 6px; border-radius: 3px; }
  .phases { list-style: none; display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
  .phases > li { border-top: 3px solid ${d.accent}; padding-top: 14px;
    display: flex; flex-direction: column; gap: 10px; }
  .phases .range { font-size: 11px; color: ${muted}; font-weight: 600;
    text-transform: uppercase; letter-spacing: 0.08em; }
  .phases ul { list-style: none; display: flex; flex-direction: column; gap: 6px;
    font-size: 14px; line-height: 20px; color: ${muted}; }
  .timeline { list-style: none; display: flex; flex-direction: column; gap: 12px; }
  .timeline li { display: grid; grid-template-columns: 40mm 1fr; gap: 14px;
    padding-bottom: 12px; border-bottom: 1px solid ${line}; }
  .timeline .when { font-size: 13px; color: ${d.accent}; font-weight: 700; }
  .timeline .what { display: flex; flex-direction: column; font-size: 16px; }
  .timeline em { font-style: normal; font-size: 13px; color: ${muted}; }
  .links { list-style: none; display: flex; flex-direction: column; gap: 14px; }
  .links li { display: flex; flex-direction: column; gap: 2px; }
  .links .label { font-size: 11px; line-height: 16px; color: ${d.accent}; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.1em; }
  .links a { color: ${d.ink}; font-size: 16px; word-break: break-all; }
  @media screen {
    body { background: #e8e8e8; padding: 24px 12px; }
    .page { margin: 0 auto 24px; max-width: 100%; box-shadow: 0 8px 30px #00000022; }
  }
</style>
</head>
<body>
${content.pages.map((p, i) => page(p, i, content)).join("\n")}
</body>
</html>`;
}
