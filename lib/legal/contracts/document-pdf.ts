import "server-only";

import {
  bodyHtml,
  documentCss,
  escapeHtml as escape,
  sheetCss,
  templateBodyHtml,
} from "@/lib/legal/contracts/document-layout";
import {
  documentFontHref,
  type DocumentFont,
} from "@/lib/legal/contracts/document-fonts";
import type { ContractLanguage } from "@/lib/legal/contracts/language";
import { htmlToPdf } from "@/lib/pdf/render";

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

// The text's look is documentCss (document-layout.ts); on screen, the text
// sits on an A4 sheet.
function page({
  title,
  language,
  main,
  letterhead,
  font,
}: {
  title: string;
  language: ContractLanguage;
  main: string;
  letterhead?: Letterhead | null;
  // Its template's typeface, from Google Fonts (printed once loaded).
  font?: DocumentFont | null;
}): string {
  return `<!doctype html>
<html lang="${language}">
<head>
<meta charset="utf-8">
<title>${escape(title)}</title>
${font ? `<link rel="stylesheet" href="${documentFontHref(font)}">` : ""}
<style>
  @page { size: A4; margin: 19mm 22mm 24mm 25mm; }
  * { box-sizing: border-box; margin: 0; }
  ${documentCss("main")}
  .letterhead { font-size: 8pt; line-height: 1.35; margin-bottom: 22pt; color: #000000; }
  @media screen {
    body { background: #e9e9e9; padding: 24px 16px; }
    ${sheetCss("main")}
  }
</style>
</head>
<body><main${font ? ` data-font="${font}"` : ""}>${letterheadHtml(letterhead)}${main}</main></body>
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
  font = null,
}: {
  title: string;
  body: string;
  language?: ContractLanguage;
  letterhead?: Letterhead | null;
  font?: DocumentFont | null;
}): string {
  return page({ title, language, letterhead, font, main: bodyHtml(body) });
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
  font?: DocumentFont | null;
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
  font = null,
}: {
  title: string;
  body: string;
  language: ContractLanguage;
  font?: DocumentFont | null;
}): string {
  const main = templateBodyHtml(body);
  return page({ title, language, main, font });
}
