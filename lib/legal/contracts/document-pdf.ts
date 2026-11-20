import "server-only";

import { legalContracts } from "@/lib/i18n/fr/legal-contracts";
import type { ContractLanguage } from "@/lib/legal/contracts/language";
import { bodySegments } from "@/lib/legal/contracts/template-text";

const escape = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

// A printed document, not the app: its own neutral colors, the same in the
// PDF and in the preview frame. On screen, the text sits on an A4 sheet.
function page({
  title,
  language,
  main,
}: {
  title: string;
  language: ContractLanguage;
  main: string;
}): string {
  return `<!doctype html>
<html lang="${language}">
<head>
<meta charset="utf-8">
<title>${escape(title)}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Google+Sans+Flex:wght@500;600&display=block">
<style>
  * { box-sizing: border-box; margin: 0; }
  body { font-family: "Google Sans Flex", system-ui, sans-serif; font-weight: 500;
    color: #000000; font-size: 13px; line-height: 20px; }
  main { white-space: pre-wrap; overflow-wrap: anywhere; }
  .field { display: inline; padding: 0 4px; border-bottom: 1px solid #8a8a8a;
    background: #f1f1f1; color: #4a4a4a; font-weight: 600; font-size: 12px;
    -webkit-box-decoration-break: clone; box-decoration-break: clone; }
  @media screen {
    body { background: #e9e9e9; padding: 24px 16px; }
    main { max-width: 210mm; margin: 0 auto; padding: 18mm 16mm; background: #ffffff;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12); }
  }
</style>
</head>
<body><main>${main}</main></body>
</html>`;
}

/**
 * The filled document alone, for the PDF sent to signature: its text as it
 * stands, nothing added (no app branding inside a contract). Escaped: the
 * values come from people. In its template's language.
 */
export function documentHtml({
  title,
  body,
  language = "fr",
}: {
  title: string;
  body: string;
  language?: ContractLanguage;
}): string {
  return page({ title, language, main: escape(body) });
}

/**
 * A template as a document (Ibé, 18/11/2026: « recevoir le modèle en PDF,
 * pas un truc avec les écritures »): its text as it is, each value it fills
 * shown as a blank labeled with what goes there (« Nom civil »), never as
 * {{personne.nom_civil}}. The preview frame and the PDF use it alike.
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
  const main = bodySegments(body)
    .map((segment) =>
      segment.kind === "text"
        ? escape(segment.text)
        : `<span class="field">${escape(legalContracts.fields[segment.id] ?? segment.id)}</span>`,
    )
    .join("");
  return page({ title, language, main });
}
