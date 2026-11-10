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

// The three facts read first (Ibé, 07/11/2026): the objective, the target
// date, the budget.
const KEY_FACTS = ["objective", "target_date", "budget_envelope"] as const;

/**
 * A version of the Brief as a standalone HTML document for the PDF, laid
 * out as an editorial document rather than an export (retours d'Ibé du
 * 02/11 and 07/11/2026): a cover — the project, the version and where it
 * stands, the objective, the target date and the budget, the contents —,
 * then the Synthèse (what to act on, PROJ-BUG-04), the six dimensions
 * numbered, each value beside its label with its source under it, and
 * « Sources et validation » to close. Every value is escaped: they come
 * from calls and from people. Styles: lib/framing/brief-pdf-style.ts.
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
  const items = snapshot.dimensions.flatMap((d) => d.items);

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
    ? `<section class="summary"><h2>${escape(p.summaryTitle)}</h2><p class="intro">${escape(p.summaryIntro)}</p><div class="groups">${groups
        .map(
          ([label, lines]) =>
            `<div><h3>${escape(label)}</h3><ul>${lines.map((l) => `<li>${escape(l)}</li>`).join("")}</ul></div>`,
        )
        .join("")}</div></section>`
    : "";

  const facts = KEY_FACTS.map((key) => items.find((i) => i.key === key))
    .filter((i): i is NonNullable<typeof i> => Boolean(i))
    .map(
      (i) =>
        `<div><dt>${escape(i.label)}</dt><dd class="${i.value ? "" : "empty"}">${escape(i.value ?? t.notProvided)}</dd></div>`,
    )
    .join("");
  const contents = [
    ...(groups.length ? [p.summaryTitle] : []),
    ...DIMENSIONS.filter((d) =>
      snapshot.dimensions.some((x) => x.dimension === d),
    ).map((d) => t.dimensions[d]),
    p.closing,
  ];
  const kind = [snapshot.project.artist, snapshot.project.kind]
    .filter(Boolean)
    .join(" · ");
  const dated = decidedAt ?? sentAt;
  const versionLine = [
    version ? t.brief.version(version) : p.draft,
    dated ? formatDay(dated) : null,
  ]
    .filter(Boolean)
    .join(" · ");

  // Where this version went: sent, then validated or sent back.
  const history = [
    sentAt ? [p.sent, formatDay(sentAt)] : null,
    decidedAt && state === "approved"
      ? [p.approved, formatDay(decidedAt)]
      : null,
    decidedAt && state === "changes_requested"
      ? [p.changes, formatDay(decidedAt)]
      : null,
  ].filter((h): h is string[] => Boolean(h));
  const closing = `<section class="closing"><h2>${escape(p.closing)}</h2>
    <h3>${escape(p.sourcesTitle)}</h3>${
      snapshot.sources.length
        ? `<ul class="list">${snapshot.sources.map((s) => `<li>${escape(s)}</li>`).join("")}</ul>`
        : `<p class="muted">${escape(t.notProvided)}</p>`
    }
    <h3>${escape(p.historyTitle)}</h3>${
      history.length
        ? `<dl class="history">${history
            .map(
              ([what, when]) =>
                `<div><dt>${escape(what)}</dt><dd>${escape(when)}</dd></div>`,
            )
            .join("")}</dl>`
        : `<p class="muted">${escape(p.noHistory)}</p>`
    }</section>`;

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>${escape(`${t.brief.title} · ${snapshot.project.title}`)}</title>
<style>${BRIEF_PDF_STYLE}</style>
</head>
<body>
  <section class="cover">
    <div class="top"><b>${escape(fr.app.name)}</b><span>${escape(snapshot.project.title)}</span></div>
    <div class="head">
      <p class="eyebrow">${escape(p.eyebrow)}</p>
      <h1>${escape(snapshot.project.title)}</h1>
      ${kind ? `<p class="kind">${escape(kind)}</p>` : ""}
      <p class="version">${escape(versionLine)}</p>
    </div>
    ${facts ? `<dl class="facts">${facts}</dl>` : ""}
    ${metaStrip(version, state, sentAt, decidedAt)}
    <nav class="contents"><h2>${escape(p.contents)}</h2><ol>${contents
      .map((c) => `<li>${escape(c)}</li>`)
      .join("")}</ol></nav>
    <p class="confidential">${escape(p.confidential)}</p>
  </section>
  ${summary}
  ${sections}
  ${closing}
</body>
</html>`;
}
