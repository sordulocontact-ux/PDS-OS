// The Brief de sortie as a standalone HTML document for its PDF: the eight
// dimensions as the version was generated, what remains to arbitrate first.
// Internal: the budget is in it, and it is never shared outside. Client-safe.

import { formatDay } from "@/lib/assistant/facts";
import { fr } from "@/lib/i18n/fr";
import type { StrategySnapshot } from "@/lib/strategy/brief-snapshot";
import { escapeHtml as e } from "@/lib/strategy/documents/render";

export function strategyBriefHtml({
  snapshot,
  version,
  state,
}: {
  snapshot: StrategySnapshot;
  version: number;
  state: string;
}): string {
  const t = fr.strategyFlow;
  const td = fr.strategyDocs;
  const p = snapshot.project;
  const header = [
    td.kinds.brief,
    td.version(version),
    (td.states as Record<string, string>)[state] ?? state,
  ].join(" · ");
  const toDecide = snapshot.toDecide.length
    ? `<ul>${snapshot.toDecide
        .map(
          (x) => `<li>${e(`${t.dimensions[x.dimension]} · ${x.label}`)}</li>`,
        )
        .join("")}</ul>`
    : `<p>${e(td.brief.noToDecide)}</p>`;
  const sections = snapshot.sections
    .map((s, index) => {
      const items = s.items
        .map((item) => {
          const value = item.lines.length
            ? `<ul>${item.lines.map((l) => `<li>${e(l)}</li>`).join("")}</ul>`
            : e(item.value ?? fr.framingIntel.notProvided);
          return `<div class="fact${item.toDecide ? " decide" : ""}"><dt>${e(item.label)}</dt><dd class="${
            !item.lines.length && !item.value ? "empty" : ""
          }">${value}</dd></div>`;
        })
        .join("");
      const internal =
        s.dimension === "budget"
          ? ` <span class="tag">${e(td.brief.budgetInternal)}</span>`
          : "";
      return `<section><h2>${e(`${t.dimensionNumber(index)} ${t.dimensions[s.dimension]}`)} <span class="tag">${e(
        t.states[s.state],
      )}</span>${internal}</h2><dl>${items}</dl></section>`;
    })
    .join("");

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>${e(`${td.kinds.brief} · ${p.title}`)}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Google+Sans+Flex:wght@500;600&display=block">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: "Google Sans Flex", system-ui, sans-serif; font-weight: 500;
    color: #000000; letter-spacing: -0.02em; font-size: 14px; line-height: 20px; }
  .eyebrow, dt { font-size: 12px; line-height: 17px; color: #767676; }
  h1 { font-size: 28px; line-height: 34px; font-weight: 600;
    letter-spacing: -0.04em; margin: 6px 0 4px; }
  .kind { color: #767676; margin-bottom: 24px; }
  .decide-box { background: #fff4e0; border-radius: 10px; padding: 12px 14px; margin-bottom: 28px; }
  .decide-box ul { padding-left: 18px; }
  section { break-inside: avoid; margin-bottom: 26px; }
  h2 { font-size: 17px; line-height: 22px; font-weight: 600; margin-bottom: 12px; }
  .tag { font-size: 11px; font-weight: 500; color: #767676; border: 1px solid #dddddd;
    border-radius: 999px; padding: 1px 8px; margin-left: 6px; vertical-align: middle; }
  dl { display: grid; grid-template-columns: 1fr 1fr; gap: 14px 40px; }
  .fact { break-inside: avoid; }
  .fact.decide { background: #fff4e0; border-radius: 8px; padding: 6px 8px; }
  dd { margin-top: 2px; font-weight: 600; white-space: pre-wrap; }
  dd ul { list-style: none; }
  dd.empty { font-weight: 500; color: #767676; }
</style>
</head>
<body>
  <p class="eyebrow">${e(header)}</p>
  <h1>${e(p.title)}</h1>
  <p class="kind">${e([p.artist, p.type, p.releaseDate ? formatDay(p.releaseDate) : null].filter(Boolean).join(" · "))}</p>
  <div class="decide-box"><strong>${e(td.brief.toDecideTitle)}</strong>${toDecide}</div>
  ${sections}
</body>
</html>`;
}
