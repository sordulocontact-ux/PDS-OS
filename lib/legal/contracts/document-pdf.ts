import "server-only";

import { legalContracts } from "@/lib/i18n/fr/legal-contracts";
import type { ContractLanguage } from "@/lib/legal/contracts/language";
import { bodySegments } from "@/lib/legal/contracts/template-text";
import { htmlToPdf } from "@/lib/pdf/render";

const escape = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

// « 1. Extension of Term. Notwithstanding… », « 2. Avance. Le Licencié… »: a
// numbered article whose heading ends with a period, on its first line.
const NUMBERED = /^(\d+)\.\s+([^.\n]{2,80})\.\s+([\s\S]*)$/;
// « Article 3 — Durée », « ARTICLE 3 : DURÉE »: a heading line alone.
const ARTICLE = /^(article\s+\d+[^\n]{0,80})$/i;
// « ACCEPTED AND AGREED: », « CONTRAT DE LICENCE »: a short line in capitals.
const CAPITALS = (line: string) =>
  line.length <= 80 &&
  /\p{Lu}/u.test(line) &&
  line === line.toLocaleUpperCase("fr-FR");

/** Inside a sentence (Sacha 22/11/2026): « **NOVA SOUND SAS** » in bold,
 * « __Company__ » underlined — the template's own marks, since a text
 * pasted in a template lost Word's. */
const inline = (escaped: string) =>
  escaped
    .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
    .replace(/__(.+?)__/g, "<u>$1</u>");

/**
 * The text of a contract laid out as Ibé's model contract (Sacha 22/11/2026,
 * « il faudrait qu'il respecte ce design »): its blocks — separated by an
 * empty line — as justified paragraphs, their own line breaks kept (an
 * address, a signature block, its tabs aligned); a numbered article's
 * heading (« 2. Avance. ») in bold underlined after its number and a tab; a
 * heading line alone (« Article 3 — Durée ») bold underlined; a short line in
 * capitals (« ACCEPTÉ ET CONVENU : ») bold. Nothing is reworded: only its
 * look. `mark` turns the escaped text into HTML (the template's blanks).
 */
function bodyHtml(body: string, mark: (escaped: string) => string): string {
  const text = (value: string) => mark(inline(escape(value)));
  return body
    .replaceAll("\r\n", "\n")
    .split(/\n[ \t]*\n/)
    .map((block) => block.replace(/^\n+|\n+$/g, ""))
    .filter((block) => block.trim() !== "")
    .map((block) => {
      const numbered = NUMBERED.exec(block);
      if (numbered)
        return `<p>${numbered[1]}.<span class="tab"></span><b><u>${text(numbered[2])}</u></b>. ${text(numbered[3]).replaceAll("\n", "<br>")}</p>`;
      const [first, ...rest] = block.split("\n");
      const head = ARTICLE.test(first.trim())
        ? `<b><u>${text(first.trim())}</u></b>`
        : CAPITALS(first.trim())
          ? `<b>${text(first)}</b>`
          : text(first);
      return `<p>${[head, ...rest.map(text)].join("<br>")}</p>`;
    })
    .join("\n");
}

// A printed document, not the app: its own neutral colors, the same in the
// PDF and in the preview frame. The look of Ibé's model contract: Arial
// 10 pt, justified, tight letter spacing; on screen, the text sits on an A4
// sheet.
/** The structure's coordinates at the head of a contract (Réglages ›
 * Coordonnées de PDS, contract_letterhead). */
export type Letterhead = {
  name: string;
  address: string;
  phone: string | null;
  email: string | null;
  website: string | null;
};

// The first page's head, as in Ibé's model: the sender in small, its name,
// its address, then its coordinates on one line.
function letterheadHtml(l: Letterhead | null | undefined): string {
  if (!l) return "";
  const lines = [
    `<b>${escape(l.name)}</b>`,
    ...l.address
      .split(/\r?\n/)
      .map((line) => escape(line.trim()))
      .filter(Boolean),
    [
      l.phone && `T : ${escape(l.phone)}`,
      l.email && escape(l.email),
      l.website && escape(l.website),
    ]
      .filter(Boolean)
      .join("&nbsp;&nbsp;·&nbsp;&nbsp;"),
  ].filter(Boolean);
  return `<header class="letterhead">${lines.join("<br>")}</header>`;
}

function page({
  title,
  language,
  main,
  letterhead,
}: {
  title: string;
  language: ContractLanguage;
  main: string;
  letterhead?: Letterhead | null;
}): string {
  return `<!doctype html>
<html lang="${language}">
<head>
<meta charset="utf-8">
<title>${escape(title)}</title>
<style>
  @page { size: A4; margin: 19mm 22mm 24mm 25mm; }
  * { box-sizing: border-box; margin: 0; }
  body { font-family: Arial, "Liberation Sans", Helvetica, sans-serif;
    color: #000000; font-size: 10pt; line-height: 1.25; letter-spacing: -0.01em; }
  main { overflow-wrap: anywhere; tab-size: 24; }
  main p { text-align: justify; white-space: pre-wrap; margin-bottom: 10pt;
    break-inside: avoid-page; }
  main .tab { display: inline-block; width: 0.5in; }
  .letterhead { font-size: 8pt; line-height: 1.35; margin-bottom: 22pt; color: #000000; }
  main u { text-underline-offset: 1.5pt; }
  .field { display: inline; padding: 0 4px; border-bottom: 1px solid #8a8a8a;
    background: #f1f1f1; color: #4a4a4a; font-weight: 600; font-size: 9pt;
    -webkit-box-decoration-break: clone; box-decoration-break: clone; }
  @media screen {
    body { background: #e9e9e9; padding: 24px 16px; }
    main { max-width: 210mm; margin: 0 auto; padding: 19mm 22mm 24mm 25mm; background: #ffffff;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12); }
  }
</style>
</head>
<body><main>${letterheadHtml(letterhead)}${main}</main></body>
</html>`;
}

/**
 * The filled document alone, for the PDF sent to signature: its text as it
 * stands, laid out as Ibé's model contract, nothing added (no app branding
 * inside a contract). Escaped: the values come from people. In its
 * template's language.
 */
export function documentHtml({
  title,
  body,
  language = "fr",
  letterhead = null,
}: {
  title: string;
  body: string;
  language?: ContractLanguage;
  letterhead?: Letterhead | null;
}): string {
  return page({ title, language, letterhead, main: bodyHtml(body, (s) => s) });
}

/**
 * A contract as a PDF: its document, A4 with the model's margins, the page
 * number and its title at the foot of each page (the model's footer).
 */
export function contractPdf(input: {
  title: string;
  body: string;
  language?: ContractLanguage;
  letterhead?: Letterhead | null;
}): Promise<Uint8Array> {
  return htmlToPdf(documentHtml(input), { cssPage: true, footer: input.title });
}

/**
 * A template as a document (Ibé, 18/11/2026: « recevoir le modèle en PDF,
 * pas un truc avec les écritures »): its text as it is, laid out like the
 * contracts it makes, each value it fills shown as a blank labeled with what
 * goes there (« Nom civil »), never as {{personne.nom_civil}}. The preview
 * frame and the PDF use it alike.
 */
export function templateHtml({
  title,
  body,
  language,
}: {
  title: string;
  body: string;
  language: ContractLanguage;
}): string {
  // Each blank as a marker the layout leaves alone, then its label.
  const ids: string[] = [];
  const marked = bodySegments(body)
    .map((segment) => {
      if (segment.kind === "text") return segment.text;
      ids.push(segment.id);
      return `\u0000${ids.length - 1}\u0000`;
    })
    .join("");
  const main = bodyHtml(marked, (escaped) =>
    escaped.replace(
      /\u0000(\d+)\u0000/g,
      (_, i: string) =>
        `<span class="field">${escape(legalContracts.fields[ids[Number(i)]] ?? ids[Number(i)])}</span>`,
    ),
  );
  return page({ title, language, main });
}
