import "server-only";

import { formatEuros } from "@/lib/budget/types";
import { formatBriefDate } from "@/lib/framing/assess";
import { fr } from "@/lib/i18n/fr";
import {
  FIGURE_GROUPS,
  type Dashboard,
  type FigureGroup,
  type FigureKey,
} from "@/lib/marketing/dashboard";
import type {
  ReportBudget,
  ReportSection,
  ReportSnapshot,
  ReportVersion,
} from "@/lib/marketing/reports/model";
import { formatLongDay, formatTime } from "@/lib/project-history/format";
import { escapeHtml as e } from "@/lib/strategy/documents/brief-html";

const t = fr.marketingReview.reports;
const d = fr.marketingReview.dashboard;
const a = fr.marketing.activations;
const ev = fr.marketing.evidence;
const number = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });

/**
 * One version of the Marketing report as a standalone HTML document for its
 * PDF, drawn from the version's snapshot only. Every page carries the version
 * it comes from (number, identifier, fingerprint): an export keeps its source
 * (écran 2, « Règles de version »). Every value is escaped; the styles mirror
 * the app's (docs/DESIGN.md), its tokens do not exist outside it.
 */
export function marketingReportHtml({
  report,
  snapshot,
  figures,
  budget,
}: {
  report: ReportVersion;
  snapshot: ReportSnapshot;
  figures: Dashboard;
  budget: ReportBudget | null;
}): string {
  const has = (s: ReportSection) => snapshot.sections.includes(s);
  const titleOf = (id: string) =>
    snapshot.activations.find((x) => x.id === id)?.title ?? "";
  const value = (key: FigureKey) => {
    const v = figures.figures[key].value;
    if (v === null) return d.unavailable;
    return key.startsWith("budget_") ? formatEuros(v) : number.format(v);
  };
  const tiles = (groups: FigureGroup[]) =>
    groups
      .map(
        (g) =>
          `<h3>${e(d.groups[g])}</h3><div class="tiles">${FIGURE_GROUPS[g]
            .map(
              (k) =>
                `<div class="tile"><b>${e(value(k))}</b><span>${e(d.figures[k])}</span></div>`,
            )
            .join("")}</div>`,
      )
      .join("");
  const section = (title: string, body: string) =>
    `<section><h2>${e(title)}</h2>${body}</section>`;
  const para = (text: string | null, empty: string) =>
    text
      ? `<p class="text">${e(text)}</p>`
      : `<p class="muted">${e(empty)}</p>`;
  const date = (iso: string | null) => (iso ? formatBriefDate(iso) : null);

  const parts: string[] = [];
  if (has("summary"))
    parts.push(
      section(
        t.sections.summary,
        para(snapshot.summary, t.view.noSummary) +
          (snapshot.excluded.length
            ? `<p class="muted">${e(t.view.excluded(snapshot.excluded.length))}</p>`
            : ""),
      ),
    );
  if (has("objectives"))
    parts.push(
      section(
        t.sections.objectives,
        `<h3>${e(t.view.strategic)}</h3>${para(snapshot.objectives.strategic, t.view.noStrategic)}<h3>${e(t.view.kpis)}</h3>${
          snapshot.objectives.kpis.length
            ? `<ul>${snapshot.objectives.kpis
                .map(
                  (k) =>
                    `<li><b>${e(k.label)}</b> <span class="muted">· ${e(
                      k.kind === "qualitative"
                        ? t.view.qualitative
                        : k.target === null
                          ? t.view.noTarget
                          : t.view.target(
                              [number.format(k.target), k.unit]
                                .filter(Boolean)
                                .join(" "),
                            ),
                    )}</span></li>`,
                )
                .join("")}</ul>`
            : `<p class="muted">${e(t.view.noKpis)}</p>`
        }`,
      ),
    );
  if (has("activations"))
    parts.push(
      section(
        t.sections.activations,
        tiles(["activations"]) +
          `<table><thead><tr><th>${e(a.columns.title)}</th><th>${e(a.columns.kind)}</th><th>${e(a.columns.status)}</th><th>${e(a.columns.owner)}</th></tr></thead><tbody>${snapshot.activations
            .map(
              (x) =>
                `<tr><td>${e(x.title)}</td><td>${e(a.kinds[x.kind])}</td><td>${e(a.statuses[x.status])}</td><td>${e(x.ownerName ?? "—")}</td></tr>`,
            )
            .join("")}</tbody></table>`,
      ),
    );
  if (has("results"))
    parts.push(
      section(
        t.sections.results,
        `<p class="muted">${e(t.view.declaredApart)}</p>` +
          tiles(["publications", "coverage"]),
      ),
    );
  if (has("statistics"))
    parts.push(
      section(
        t.sections.statistics,
        tiles(["statistics"]) +
          (figures.metrics.length
            ? `<h3>${e(d.metrics.title)}</h3><table><thead><tr><th>${e(d.metrics.metric)}</th><th>${e(d.metrics.declared)}</th><th>${e(d.metrics.verified)}</th><th>${e(d.metrics.gaps)}</th></tr></thead><tbody>${figures.metrics
                .map(
                  (m) =>
                    `<tr><td>${e(m.metric)}</td><td>${e(m.declared === null ? d.unavailable : number.format(m.declared))}</td><td>${e(m.verified === null ? d.unavailable : number.format(m.verified))}</td><td>${e(d.metrics.gapsText(m.partial, m.unavailable))}</td></tr>`,
                )
                .join("")}</tbody></table>`
            : ""),
      ),
    );
  if (has("budget"))
    parts.push(
      section(
        t.sections.budget,
        budget
          ? tiles(["budget"])
          : `<p class="muted">${e(t.view.budgetMissing)}</p>`,
      ),
    );
  if (has("reserves"))
    parts.push(
      section(
        t.sections.reserves,
        (snapshot.reserves.length
          ? `<ul>${snapshot.reserves
              .map(
                (r) =>
                  `<li><span class="muted">${e(t.reserveCategories[r.category])}${r.activationId ? ` · ${e(titleOf(r.activationId))}` : ""}</span><br>${e(r.description)}</li>`,
              )
              .join("")}</ul>`
          : `<p class="muted">${e(t.view.noReserves)}</p>`) +
          `<h3>${e(t.view.recommendations)}</h3>${para(snapshot.recommendations, t.view.noRecommendations)}`,
      ),
    );
  if (has("annexes"))
    parts.push(
      section(
        t.sections.annexes,
        snapshot.evidence.length
          ? `<table><thead><tr><th>${e(d.detail.activation)}</th><th>${e(d.detail.evidence)}</th><th>${e(d.detail.level)}</th><th>${e(d.detail.provenance)}</th></tr></thead><tbody>${snapshot.evidence
              .map(
                (x) =>
                  `<tr><td>${e(titleOf(x.activationId))}</td><td>${e(x.label)}<br><span class="muted">${e(
                    [
                      ev.sections[x.kind],
                      x.kind === "statistic"
                        ? x.value === null
                          ? ev.unavailableValue
                          : number.format(x.value)
                        : null,
                      x.metric,
                      x.url,
                      x.kind === "publication" && !x.url ? ev.noLink : null,
                      x.linkUnreachableAt ? ev.linkUnreachable : null,
                    ]
                      .filter(Boolean)
                      .join(" · "),
                  )}</span></td><td>${e(ev.verifications[x.verification])}</td><td class="muted">${e(
                    [
                      x.reportedBy && ev.provenance.reportedBy(x.reportedBy),
                      x.observedOn &&
                        ev.provenance.observedOn(formatBriefDate(x.observedOn)),
                      ev.provenance.importedOn(formatLongDay(x.createdAt)),
                      x.verifiedAt &&
                        ev.provenance.verified(
                          x.verifiedByName,
                          formatLongDay(x.verifiedAt),
                        ),
                    ]
                      .filter(Boolean)
                      .join(" · "),
                  )}</td></tr>`,
              )
              .join("")}</tbody></table>`
          : `<p class="muted">${e(t.view.noEvidence)}</p>`,
      ),
    );

  const meta = [
    report.authorName
      ? t.meta.generatedBy(
          report.authorName,
          formatLongDay(report.createdAt),
          formatTime(report.createdAt),
        )
      : t.meta.generatedOn(
          formatLongDay(report.createdAt),
          formatTime(report.createdAt),
        ),
    t.meta.period(date(report.periodStart), date(report.periodEnd)),
    t.meta.scope(report.activationIds.length),
    t.meta.rules(report.rulesVersion),
  ].join(" · ");
  const source = `${t.versionLabel(report.version)} · ${t.meta.versionId(report.id)} · ${t.meta.fingerprint} ${report.contentHash}`;

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>${e(`${t.versionLabel(report.version)} · ${snapshot.projectTitle}`)}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Google+Sans+Flex:wght@500;600&display=block">
<style>
  @page { margin: 18mm 16mm 22mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: "Google Sans Flex", system-ui, sans-serif; font-weight: 500;
    color: #000000; letter-spacing: -0.02em; font-size: 13px; line-height: 19px; }
  .eyebrow, .muted { color: #767676; }
  .eyebrow { font-size: 12px; line-height: 17px; }
  h1 { font-size: 26px; line-height: 32px; font-weight: 600; letter-spacing: -0.04em; margin: 6px 0 4px; }
  .meta { color: #767676; font-size: 12px; margin-bottom: 4px; }
  .source { color: #767676; font-size: 10px; line-height: 14px; word-break: break-all; margin-bottom: 24px; }
  section { margin-bottom: 22px; }
  h2 { font-size: 16px; line-height: 22px; font-weight: 600; margin-bottom: 8px; }
  h3 { font-size: 13px; font-weight: 600; margin: 10px 0 6px; }
  .text { white-space: pre-wrap; }
  .tiles { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; margin-bottom: 6px; }
  .tile { border: 1px solid #e3e3e3; border-radius: 10px; padding: 8px; break-inside: avoid; }
  .tile b { display: block; font-size: 16px; line-height: 20px; font-weight: 600; }
  .tile span { font-size: 11px; color: #767676; }
  table { width: 100%; border-collapse: collapse; margin-top: 6px; }
  th { text-align: left; font-size: 11px; color: #767676; font-weight: 500; padding: 4px 6px 4px 0; }
  td { vertical-align: top; padding: 5px 6px 5px 0; word-break: break-word; }
  tr { break-inside: avoid; }
  ul { list-style: none; }
  li { margin-bottom: 6px; }
  footer { position: fixed; bottom: -14mm; left: 0; right: 0; font-size: 9px; color: #767676; word-break: break-all; }
</style>
</head>
<body>
  <footer>${e(source)}</footer>
  <p class="eyebrow">${e(`${t.versionLabel(report.version)} · ${t.states[report.state]}`)}</p>
  <h1>${e(snapshot.projectTitle)}</h1>
  <p class="meta">${e(meta)}</p>
  <p class="source">${e(source)}</p>
  ${parts.join("\n")}
</body>
</html>`;
}
