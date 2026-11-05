import "server-only";

import { BRIEF_PDF_STYLE } from "@/lib/framing/brief-pdf-style";
import type { BriefSnapshot } from "@/lib/framing/brief-snapshot";
import { summaryGroups } from "@/lib/framing/brief-snapshot";
import { DIMENSIONS } from "@/lib/framing/dimensions";
import { fr } from "@/lib/i18n/fr";
import { briefVersionTone } from "@/lib/ui/state-tones";
import { formatDay } from "@/lib/utils/day";

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

// The version's facts on one strip: Version, État, Envoyée le, Validée le.
function metaStrip(
  version: number | null,
  state: string | null,
  sentAt: string | null,
  decidedAt: string | null,
): string {
  const t = fr.framingIntel.brief;
  const p = fr.framingJourney.brief.pdf;
  const label = state ? (t.states as Record<string, string>)[state] : p.notSent;
  const tone = state ? (briefVersionTone[state] ?? "neutral") : "neutral";
  const cells: Array<[string, string]> = [
    [p.version, version ? String(version) : p.draft],
    [
      p.state,
      `<span class="pill ${tone}">${escape(label ?? state ?? "")}</span>`,
    ],
  ];
  if (sentAt) cells.push([p.sentAt, escape(formatDay(sentAt))]);
  if (decidedAt && state === "approved")
    cells.push([p.approvedAt, escape(formatDay(decidedAt))]);
  return `<dl class="meta">${cells
    .map(([dt, dd]) => `<div><dt>${escape(dt)}</dt><dd>${dd}</dd></div>`)
    .join("")}</dl>`;
}

/**
 * A version of the Brief as a standalone HTML document for the PDF (retour
 * d'Ibé du 02/11/2026): the project and where the Brief stands, the
 * Synthèse (what to act on, PROJ-BUG-04), the six dimensions numbered, then
 * the sources. Every value is escaped: they come from calls and from people.
 * Styles: lib/framing/brief-pdf-style.ts.
 */
export function briefHtml({
  snapshot,
  version,
  state,
  sentAt = null,
  decidedAt = null,
}: {
  snapshot: BriefSnapshot;
  version: number | null;
  state: string | null;
  sentAt?: string | null;
  decidedAt?: string | null;
}): string {
  const t = fr.framingIntel;
  const p = fr.framingJourney.brief.pdf;
  const sourceOf = (text: string | null | undefined) =>
    text ? `<span class="source">${escape(text)}</span>` : "";

  const sections = DIMENSIONS.map((dimension, index) => {
    const d = snapshot.dimensions.find((x) => x.dimension === dimension);
    if (!d) return "";
    const rows = [
      ...d.facts.map(
        (f) =>
          `<div class="row"><dt>${escape(f.label)}</dt><dd>${escape(f.value)}</dd></div>`,
      ),
      ...d.items.map((item) => {
        const empty = !item.lines.length && !item.value;
        const value = item.lines.length
          ? `<ul>${item.lines.map((l) => `<li>${escape(l)}</li>`).join("")}</ul>`
          : escape(item.value ?? t.notProvided);
        return `<div class="row"><dt>${escape(item.label)}</dt><dd class="${empty ? "empty" : ""}">${value}${sourceOf(item.initial)}${sourceOf(item.source)}</dd></div>`;
      }),
    ].join("");
    return `<section class="dimension"><header><span class="number">${t.dimensionNumber(index)}</span><h2>${escape(t.dimensions[dimension])}</h2></header><dl>${rows}</dl></section>`;
  }).join("");

  const groups = summaryGroups(snapshot);
  const summary = groups.length
    ? `<section class="summary"><h2>${escape(t.summary.title)}</h2><div class="groups">${groups
        .map(
          ([label, lines]) =>
            `<div><h3>${escape(label)}</h3><ul>${lines.map((l) => `<li>${escape(l)}</li>`).join("")}</ul></div>`,
        )
        .join("")}</div></section>`
    : "";
  const sources = snapshot.sources.length
    ? `<p class="sources"><b>${escape(t.brief.sources)}</b> · ${escape(snapshot.sources.join(" · "))}</p>`
    : "";
  const kind = [snapshot.project.artist, snapshot.project.kind]
    .filter(Boolean)
    .join(" · ");

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>${escape(`${t.brief.title} · ${snapshot.project.title}`)}</title>
<style>${BRIEF_PDF_STYLE}</style>
</head>
<body>
  <div class="top"><b>${escape(fr.app.name)}</b><span>${escape(
    [t.brief.title, version ? t.brief.version(version) : null]
      .filter(Boolean)
      .join(" · "),
  )}</span></div>
  <div class="head">
    <p class="eyebrow">${escape(p.eyebrow)}</p>
    <h1>${escape(snapshot.project.title)}</h1>
    ${kind ? `<p class="kind">${escape(kind)}</p>` : ""}
  </div>
  ${metaStrip(version, state, sentAt, decidedAt)}
  ${summary}
  ${sections}
  ${sources}
</body>
</html>`;
}
