import "server-only";

import type { BriefSnapshot } from "@/lib/framing/brief-snapshot";
import { summaryGroups } from "@/lib/framing/brief-snapshot";
import { DIMENSIONS } from "@/lib/framing/dimensions";
import { fr } from "@/lib/i18n/fr";
import { GOOGLE_SANS_FLEX_FACES } from "@/lib/pdf/fonts/google-sans-flex";

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
  return `${fr.framingIntel.brief.title} - ${title || "projet"}.pdf`;
}

/**
 * A version of the Brief as a standalone HTML document for the PDF export:
 * the six dimensions, then the sources. Every value is escaped: they come
 * from calls and from people. The styles mirror the app's (docs/DESIGN.md:
 * Google Sans Flex, medium minimum, ink and grey) because the tokens of
 * app/globals.css do not exist outside the app.
 */
export function briefHtml({
  snapshot,
  version,
  state,
}: {
  snapshot: BriefSnapshot;
  version: number | null;
  state: string | null;
}): string {
  const t = fr.framingIntel;
  const header = [
    t.brief.title,
    version ? t.brief.version(version) : null,
    state ? (t.brief.states as Record<string, string>)[state] : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const sections = DIMENSIONS.map((dimension, index) => {
    const d = snapshot.dimensions.find((x) => x.dimension === dimension);
    if (!d) return "";
    const rows = [
      ...d.facts.map(
        (f) =>
          `<div class="fact"><dt>${escape(f.label)}</dt><dd>${escape(f.value)}</dd></div>`,
      ),
      ...d.items.map((item) => {
        const value = item.lines.length
          ? `<ul>${item.lines.map((l) => `<li>${escape(l)}</li>`).join("")}</ul>`
          : escape(item.value ?? t.notProvided);
        const empty = !item.lines.length && !item.value;
        return `<div class="fact"><dt>${escape(item.label)}</dt><dd class="${empty ? "empty" : ""}">${value}</dd>${item.initial ? `<p class="source">${escape(item.initial)}</p>` : ""}${item.source ? `<p class="source">${escape(item.source)}</p>` : ""}</div>`;
      }),
    ].join("");
    return `<section><h2>${escape(`${t.dimensionNumber(index)} ${t.dimensions[dimension]}`)}</h2><dl>${rows}</dl></section>`;
  }).join("");
  // The summary first: what to act on (PROJ-BUG-04).
  const groups = summaryGroups(snapshot);
  const summary = groups.length
    ? `<section><h2>${escape(t.summary.title)}</h2><dl>${groups
        .map(
          ([label, lines]) =>
            `<div class="fact"><dt>${escape(label)}</dt><dd><ul>${lines.map((l) => `<li>${escape(l)}</li>`).join("")}</ul></dd></div>`,
        )
        .join("")}</dl></section>`
    : "";
  const sources = snapshot.sources.length
    ? `<section><h2>${escape(t.brief.sources)}</h2><p>${escape(snapshot.sources.join(" · "))}</p></section>`
    : "";

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>${escape(`${t.brief.title} · ${snapshot.project.title}`)}</title>
<style>
${GOOGLE_SANS_FLEX_FACES}
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: "Google Sans Flex", system-ui, sans-serif; font-weight: 500;
    color: #000000; letter-spacing: -0.02em; font-size: 14px; line-height: 20px; }
  .eyebrow, dt, .source { font-size: 12px; line-height: 17px; color: #767676; }
  h1 { font-size: 28px; line-height: 34px; font-weight: 600;
    letter-spacing: -0.04em; margin: 6px 0 4px; }
  .kind { color: #767676; margin-bottom: 32px; }
  section { break-inside: avoid; margin-bottom: 28px; }
  h2 { font-size: 17px; line-height: 22px; font-weight: 600; margin-bottom: 12px; }
  dl { display: grid; grid-template-columns: 1fr 1fr; gap: 16px 40px; }
  .fact { break-inside: avoid; }
  dd { margin-top: 2px; font-weight: 600; white-space: pre-line; }
  dd ul { list-style: none; }
  dd.empty { font-weight: 500; color: #767676; }
</style>
</head>
<body>
  <p class="eyebrow">${escape(header)}</p>
  <h1>${escape(snapshot.project.title)}</h1>
  <p class="kind">${escape([snapshot.project.kind, snapshot.project.artist].filter(Boolean).join(" · "))}</p>
  ${summary}
  ${sections}
  ${sources}
</body>
</html>`;
}
