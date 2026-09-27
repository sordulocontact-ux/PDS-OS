import "server-only";

import type { BriefFact } from "@/lib/framing/brief-summary";
import { fr } from "@/lib/i18n/fr";

const escape = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

/** "Brief de cadrage - Nouveau Plug.pdf", safe for any file system. */
export function briefFileName(projectTitle: string): string {
  const title = projectTitle.replace(/[\\/:*?"<>|]+/g, " ").trim();
  return `${fr.framingGuide.brief.eyebrow} - ${title || "projet"}.pdf`;
}

/**
 * The shareable Brief as a standalone HTML document for the PDF export. Every
 * value is escaped: they come from calls and from people. The styles mirror
 * the app's (docs/DESIGN.md: Google Sans Flex, medium minimum, ink and grey)
 * because the tokens of app/globals.css do not exist outside the app.
 */
export function briefHtml({
  projectTitle,
  objective,
  facts,
}: {
  projectTitle: string;
  objective: string | null;
  facts: BriefFact[];
}): string {
  const t = fr.framingGuide;
  const rows = facts
    .map(
      (fact) => `<div class="fact">
        <dt>${escape(fact.label)}</dt>
        <dd class="${fact.value ? "" : "empty"}">${escape(fact.value ?? t.line.empty)}</dd>
      </div>`,
    )
    .join("");

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>${escape(`${t.brief.eyebrow} · ${projectTitle}`)}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Google+Sans+Flex:wght@500;600&display=block">
<style>
  * { box-sizing: border-box; margin: 0; }
  body { font-family: "Google Sans Flex", system-ui, sans-serif; font-weight: 500;
    color: #000000; letter-spacing: -0.02em; font-size: 15px; line-height: 22px; }
  .eyebrow, dt { font-size: 13px; line-height: 18px; color: #767676; }
  .project { color: #000000; font-weight: 600; margin-bottom: 36px; }
  h1 { font-size: 28px; line-height: 34px; font-weight: 600;
    letter-spacing: -0.04em; margin: 6px 0 36px; }
  dl { display: grid; grid-template-columns: 1fr 1fr; gap: 24px 40px; }
  .fact { break-inside: avoid; }
  dd { margin-top: 4px; font-weight: 600; }
  dd.empty { font-weight: 500; color: #767676; }
</style>
</head>
<body>
  <p class="eyebrow project">${escape(`${t.brief.eyebrow} · ${projectTitle}`)}</p>
  <p class="eyebrow">${escape(t.brief.objective)}</p>
  <h1>${escape(objective ?? t.summary.noObjective)}</h1>
  <dl>${rows}</dl>
</body>
</html>`;
}
