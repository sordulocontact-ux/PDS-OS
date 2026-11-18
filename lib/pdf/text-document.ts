import "server-only";

import { escapeHtml as escape } from "@/lib/email/layout";
import { GOOGLE_SANS_FLEX_FACES } from "@/lib/pdf/fonts/google-sans-flex";

/**
 * Any text laid out as a PDF of PDS (PO's « mets ça en PDF », docs/
 * ASSISTANT.md § 3 sexies): a mail, a note, a summary, an answer. The
 * styles mirror the call summary's PDF (lib/calls/meeting/summary-pdf.ts).
 * Everything is escaped: the text is data, never markup.
 *
 * Read: « # » and « ## » headings, « - » / « • » / « — » lists, « 1. »
 * steps, « | a | b | » tables, « **gras** », the rest paragraphs.
 */

const bold = (line: string) =>
  escape(line).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

const cellsOf = (line: string) =>
  line
    .trim()
    .replace(/^\||\|$/g, "")
    .split("|")
    .map((c) => c.trim());

const isRule = (line: string) => /^\s*\|?\s*:?-{2,}/.test(line);

function bodyOf(text: string): string {
  const out: string[] = [];
  let list: { tag: "ul" | "ol"; items: string[] } | null = null;
  let table: string[][] | null = null;
  const flush = () => {
    if (list)
      out.push(
        `<${list.tag}>${list.items.map((i) => `<li>${i}</li>`).join("")}</${list.tag}>`,
      );
    if (table) {
      const [head, ...rows] = table;
      out.push(
        `<table><thead><tr>${head.map((c) => `<th>${bold(c)}</th>`).join("")}</tr></thead><tbody>${rows
          .map(
            (r) => `<tr>${r.map((c) => `<td>${bold(c)}</td>`).join("")}</tr>`,
          )
          .join("")}</tbody></table>`,
      );
    }
    list = null;
    table = null;
  };
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (line.startsWith("|")) {
      if (list) flush();
      if (isRule(line)) continue;
      table = table ?? [];
      table.push(cellsOf(line));
      continue;
    }
    if (table) flush();
    if (!line) {
      flush();
      continue;
    }
    const heading = line.match(/^(#{1,3})\s+(.*)$/);
    if (heading) {
      flush();
      const tag = heading[1].length === 1 ? "h2" : "h3";
      out.push(`<${tag}>${bold(heading[2])}</${tag}>`);
      continue;
    }
    const bullet = line.match(/^[-•—–*]\s+(.*)$/);
    const step = line.match(/^\d+[.)]\s+(.*)$/);
    const item = bullet ?? step;
    if (item) {
      const tag = bullet ? "ul" : "ol";
      if (list && list.tag !== tag) flush();
      list = list ?? { tag, items: [] };
      list.items.push(bold(item[1]));
      continue;
    }
    flush();
    out.push(`<p>${bold(line)}</p>`);
  }
  flush();
  return out.join("\n");
}

// The model often starts the text with the title it also gave: said once.
function withoutTitle(body: string, title: string): string {
  const lines = body.trimStart().split("\n");
  const first = lines[0]
    ?.replace(/^#{1,3}\s+/, "")
    .replace(/\*\*/g, "")
    .trim();
  return first?.toLowerCase() === title.trim().toLowerCase()
    ? lines.slice(1).join("\n")
    : body;
}

export function textDocumentHtml(input: {
  title: string;
  body: string;
  // « Préparé avec PO pour Sacha, le 18 novembre 2026 »
  foot: string;
}): string {
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>${escape(input.title)}</title>
<style>
${GOOGLE_SANS_FLEX_FACES}
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: "Google Sans Flex", system-ui, sans-serif; font-weight: 500;
    color: #000000; letter-spacing: -0.02em; font-size: 14px; line-height: 21px; }
  h1 { font-size: 28px; line-height: 34px; font-weight: 600;
    letter-spacing: -0.04em; margin-bottom: 24px; }
  h2 { font-size: 17px; line-height: 22px; font-weight: 600; margin: 22px 0 10px;
    break-after: avoid; }
  h3 { font-size: 15px; line-height: 20px; font-weight: 600; margin: 18px 0 8px;
    break-after: avoid; }
  strong { font-weight: 600; }
  p + p { margin-top: 10px; }
  ul, ol, table { margin: 12px 0; }
  ul { list-style: none; display: flex; flex-direction: column; gap: 8px; }
  ul li { position: relative; padding-left: 16px; break-inside: avoid; }
  ul li::before { content: ""; position: absolute; left: 2px; top: 8px; width: 5px;
    height: 5px; border-radius: 50%; background: #000000; }
  ol { padding-left: 20px; display: flex; flex-direction: column; gap: 8px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; line-height: 17px; }
  th { text-align: left; font-weight: 600; color: #767676; }
  th, td { padding: 6px 8px; border-bottom: 1px solid #ececec; vertical-align: top; }
  tr { break-inside: avoid; }
  .foot { margin-top: 32px; padding-top: 12px; border-top: 1px solid #ececec;
    font-size: 12px; line-height: 17px; color: #767676; }
</style>
</head>
<body>
  <h1>${escape(input.title)}</h1>
  ${bodyOf(withoutTitle(input.body, input.title))}
  <p class="foot">${escape(input.foot)}</p>
</body>
</html>`;
}

/** « Relance mixeur.pdf », safe for any disk. */
export function pdfFileName(title: string): string {
  const clean = title
    .replace(/[\\/:*?"<>|]+/g, " ")
    .trim()
    .slice(0, 80);
  return `${clean || "Document"}.pdf`;
}
