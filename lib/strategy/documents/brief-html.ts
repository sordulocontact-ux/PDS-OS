import "server-only";

import { formatDay } from "@/lib/assistant/facts";
import { fr } from "@/lib/i18n/fr";
import type { BriefSnapshot } from "@/lib/strategy/documents/brief-snapshot";

export const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
const e = escapeHtml;

/**
 * A version of the Brief de sortie as a standalone HTML document for its
 * PDF: what remains to arbitrate first, then the eight dimensions, exactly
 * as the version was established. Internal: the budget is in it. Every
 * value is escaped. The styles mirror the app's (docs/DESIGN.md: Google
 * Sans Flex, medium minimum, ink and grey): the app's tokens do not exist
 * outside it.
 */
export function strategyBriefHtml({
  snapshot,
  version,
  state,
}: {
  snapshot: BriefSnapshot;
  version: number;
  state: string;
}): string {
  const td = fr.strategyDocuments;
  const tb = fr.strategyBrief;
  const dims = fr.strategyPilot.dimensions;
  const p = snapshot.project;
  const header = [
    td.kinds.brief,
    td.version(version),
    (td.states as Record<string, string>)[state] ?? state,
  ].join(" · ");
  const toDecide = snapshot.toDecide.length
    ? `<div class="decide-box"><strong>${e(tb.toDecide.title)}</strong><ul>${snapshot.toDecide
        .map((x) => `<li>${e(x.text)}</li>`)
        .join("")}</ul></div>`
    : `<p class="none">${e(tb.toDecide.none)}</p>`;
  const sections = snapshot.sections
    .map((s, index) => {
      const items = s.items
        .map((item) => {
          const lines = item.lines
            .map(
              (l) =>
                `<li class="${l.warn ? "warn" : ""}">${l.head ? `<b>${e(l.head)}</b> ` : ""}${l.rest ? `<span class="${l.head ? "rest" : ""}">${e(l.head ? `· ${l.rest}` : l.rest)}</span>` : ""}</li>`,
            )
            .join("");
          const body =
            item.value === null && !item.lines.length
              ? `<p class="empty">${e(item.empty)}</p>`
              : `${item.value !== null ? `<p class="value">${e(item.value)}</p>` : ""}${lines ? `<ul>${lines}</ul>` : ""}`;
          return `<div class="item">${item.label ? `<p class="label">${e(item.label)}</p>` : ""}${body}</div>`;
        })
        .join("");
      const flag = s.toDecide
        ? ` <span class="tag">${e(tb.toDecide.badge)}</span>`
        : "";
      return `<section><h2><span class="num">${e(fr.strategyPilot.number(index))}</span> ${e(dims[s.dimension])}${flag}</h2>${items}</section>`;
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
  .eyebrow, .label { font-size: 12px; line-height: 17px; color: #767676; }
  h1 { font-size: 28px; line-height: 34px; font-weight: 600; letter-spacing: -0.04em; margin: 6px 0 4px; }
  .kind { color: #767676; margin-bottom: 24px; }
  .decide-box { background: #fff4e0; color: #8a4b00; border-radius: 10px; padding: 12px 14px; margin-bottom: 28px; }
  .decide-box ul { padding-left: 18px; margin-top: 4px; }
  .none { background: #e9f7ee; color: #1d6b3a; border-radius: 10px; padding: 12px 14px; margin-bottom: 28px; }
  section { break-inside: avoid; margin-bottom: 24px; }
  h2 { font-size: 17px; line-height: 22px; font-weight: 600; margin-bottom: 10px; }
  .num { color: #767676; font-weight: 500; margin-right: 6px; }
  .tag { font-size: 11px; font-weight: 500; color: #8a4b00; background: #fff4e0;
    border-radius: 999px; padding: 1px 8px; margin-left: 6px; vertical-align: middle; }
  .item { margin-bottom: 8px; }
  .value { white-space: pre-wrap; }
  ul { list-style: none; }
  li { margin-bottom: 2px; }
  .rest { color: #767676; }
  li.warn { color: #8a4b00; }
  .empty { color: #767676; }
</style>
</head>
<body>
  <p class="eyebrow">${e(header)}</p>
  <h1>${e(p.title)}</h1>
  <p class="kind">${e([p.artist, p.kind, p.releaseDate ? formatDay(p.releaseDate) : null].filter(Boolean).join(" · "))}</p>
  ${toDecide}
  ${sections}
</body>
</html>`;
}
