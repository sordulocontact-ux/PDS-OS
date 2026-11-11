import "server-only";

import type { DealMemo } from "@/lib/deals/memos";
import { formatTermValue } from "@/lib/deals/term-format";
import { escapeHtml } from "@/lib/email/layout";
import { dealMemos } from "@/lib/i18n/fr/deal-memos";
import { deals } from "@/lib/i18n/fr/deals";
import { formatInstantDay } from "@/lib/utils/instant";

const fr = { dealMemos, deals };

const escape = escapeHtml;

/** A deal memo as a page to print in PDF (lib/pdf/render.ts): its number
 * and status, who made and validated it, then one row per term. */
export function memoHtml(memo: DealMemo, dealName: string): string {
  const t = fr.dealMemos;
  const stage =
    fr.deals.stages[memo.stage as keyof typeof fr.deals.stages] ?? memo.stage;
  const rows = memo.terms
    .map(
      (term) =>
        `<tr><td>${escape(fr.deals.terms.labels[term.key] ?? term.key)}</td><td>${escape(
          formatTermValue(term.format, term.value) ?? "",
        )}</td><td>${escape(fr.deals.terms.states[term.state])}</td></tr>`,
    )
    .join("");
  const meta = [
    `${t.statuses[memo.status]} · ${t.pdf.meta(stage, formatInstantDay(memo.createdAt))}`,
    t.meta(memo.createdBy, formatInstantDay(memo.createdAt)),
    memo.validatedAt
      ? t.validatedBy(memo.validatedBy, formatInstantDay(memo.validatedAt))
      : null,
  ].filter(Boolean) as string[];
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${escape(t.name(memo.number))}</title>
<style>body{font-family:system-ui,sans-serif;font-size:12pt;line-height:1.5;margin:2cm;color:#111}
h1{font-size:18pt;margin:0 0 4pt}h2{font-size:13pt;margin:0 0 12pt;font-weight:500}p.meta{color:#555;margin:0 0 4pt}
table{width:100%;border-collapse:collapse;margin-top:18pt}th,td{text-align:left;vertical-align:top;padding:6pt 8pt;border-bottom:1px solid #ddd}
th{font-size:10pt;color:#555;font-weight:600}</style></head><body>
<h1>${escape(t.name(memo.number))}</h1>
<h2>${escape(dealName)}</h2>
${meta.map((line) => `<p class="meta">${escape(line)}</p>`).join("")}
${
  memo.terms.length
    ? `<table><thead><tr><th>${escape(t.pdf.term)}</th><th>${escape(t.pdf.value)}</th><th>${escape(t.pdf.state)}</th></tr></thead><tbody>${rows}</tbody></table>`
    : `<p>${escape(t.noTerms)}</p>`
}
</body></html>`;
}
