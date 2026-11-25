// The look of a contract's text, one source for the PDF, the template's
// preview and the editor that shows the contract as its PDF (Sacha
// 25/11/2026: « qu'on voie directement le contrat en PDF avec les
// variables »). Client-safe: strings only, no DOM.

import { legalContracts } from "@/lib/i18n/fr/legal-contracts";
import { bodySegments } from "@/lib/legal/contracts/template-text";

export const escapeHtml = (value: string) =>
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
    // Never a line to fill in by hand (« né le ____________ à … »).
    .replace(/(?<!_)__(?!_)(.+?)(?<!_)__(?!_)/g, "<u>$1</u>");

/**
 * The text of a contract laid out as Ibé's model contract (Sacha 22/11/2026,
 * « il faudrait qu'il respecte ce design »): its blocks — separated by an
 * empty line — as justified paragraphs, their own line breaks kept (an
 * address, a signature block, its tabs aligned); a numbered article's
 * heading (« 2. Avance. ») in bold underlined after its number and a tab; a
 * heading line alone (« Article 3 — Durée ») bold underlined; a short line in
 * capitals (« ACCEPTÉ ET CONVENU : ») bold. Nothing is reworded: only its
 * look. `mark` turns the escaped text into HTML (the template's blanks).
 * What the layout itself makes bold is `data-auto`: the editor reads it back
 * as plain text, never as the template's own marks.
 */
export function bodyHtml(
  body: string,
  mark: (escaped: string) => string = (s) => s,
): string {
  const text = (value: string) => mark(inline(escapeHtml(value)));
  return body
    .replaceAll("\r\n", "\n")
    .split(/\n[ \t]*\n/)
    .map((block) => block.replace(/^\n+|\n+$/g, ""))
    .filter((block) => block.trim() !== "")
    .map((block) => {
      const numbered = NUMBERED.exec(block);
      if (numbered)
        return `<p>${numbered[1]}.<span class="tab"></span><b data-auto><u data-auto>${text(numbered[2])}</u></b>. ${text(numbered[3]).replaceAll("\n", "<br>")}</p>`;
      const [first, ...rest] = block.split("\n");
      const head = ARTICLE.test(first.trim())
        ? `<b data-auto><u data-auto>${text(first.trim())}</u></b>`
        : CAPITALS(first.trim())
          ? `<b data-auto>${text(first)}</b>`
          : text(first);
      return `<p>${[head, ...rest.map(text)].join("<br>")}</p>`;
    })
    .join("\n");
}

/** A field's label (« Nom civil »), never {{personne.nom_civil}}. */
export const fieldLabelOf = (id: string) => legalContracts.fields[id] ?? id;

/**
 * A template's text laid out, each value it fills as a blank labeled with
 * what goes there. `blank` draws the blank: a plain span in the PDF, a span
 * the editor keeps whole (`editable`).
 */
export function templateBodyHtml(
  body: string,
  { editable = false }: { editable?: boolean } = {},
): string {
  // Each blank as a marker the layout leaves alone, then its label.
  const ids: string[] = [];
  const marked = bodySegments(body)
    .map((segment) => {
      if (segment.kind === "text") return segment.text;
      ids.push(segment.id);
      return `\u0000${ids.length - 1}\u0000`;
    })
    .join("");
  return bodyHtml(marked, (escaped) =>
    escaped.replace(/\u0000(\d+)\u0000/g, (_, i: string) => {
      const id = ids[Number(i)];
      const attrs = editable
        ? ` data-field="${escapeHtml(id)}" contenteditable="false"`
        : "";
      return `<span class="field"${attrs}>${escapeHtml(fieldLabelOf(id))}</span>`;
    }),
  );
}

/**
 * The look of the text, under `scope`. A printed document, not the app: its
 * own neutral colors, the same in the PDF, the preview frame and the
 * editor. The look of Ibé's model contract: Arial 10 pt, justified, tight
 * letter spacing.
 */
export const documentCss = (scope: string) => `
  ${scope} { font-family: Arial, "Liberation Sans", Helvetica, sans-serif;
    color: #000000; font-size: 10pt; line-height: 1.25; letter-spacing: -0.01em;
    overflow-wrap: anywhere; tab-size: 24; }
  ${scope} p { text-align: justify; white-space: pre-wrap; margin: 0 0 10pt;
    break-inside: avoid-page; }
  ${scope} .tab { display: inline-block; width: 0.5in; }
  ${scope} u { text-underline-offset: 1.5pt; }
  ${scope} .field { display: inline; padding: 0 4px; border-bottom: 1px solid #8a8a8a;
    background: #f1f1f1; color: #4a4a4a; font-weight: 600; font-size: 9pt;
    -webkit-box-decoration-break: clone; box-decoration-break: clone; }`;

/**
 * The text on its A4 sheet, on screen: the preview frame and the editor
 * alike. A sheet on a phone keeps narrow margins. `data-placeholder` is
 * shown on an empty sheet (`data-empty`), on its first line.
 */
export const sheetCss = (scope: string) => `
  ${scope} { display: block; max-width: 210mm; min-height: 297mm; margin: 0 auto;
    padding: 19mm 22mm 24mm 25mm; background: #ffffff; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12); }
  ${scope}[data-empty]::before { content: attr(data-placeholder); display: block; height: 0;
    color: #6e6e6e; pointer-events: none; }
  @media (max-width: 40rem) { ${scope} { min-height: 0; padding: 20px 16px 28px; } }`;
