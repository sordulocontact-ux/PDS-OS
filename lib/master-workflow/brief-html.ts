import { fr } from "@/lib/i18n/fr";
import {
  BRIEF_DATES,
  type MasterBrief,
} from "@/lib/master-workflow/brief-types";
import { formatDay } from "@/lib/utils/day";

const esc = (value: string) =>
  value.replace(/[&<>"']/g, (c) =>
    c === "&"
      ? "&amp;"
      : c === "<"
        ? "&lt;"
        : c === ">"
          ? "&gt;"
          : c === '"'
            ? "&quot;"
            : "&#39;",
  );

const t = fr.masterBrief;

/**
 * The Brief Mix/Master as a printable page (lib/pdf/render.ts, proto « PDF
 * du Brief »): what the engineers receive, by section. The internal rates
 * never appear (rule of the Brief: « jamais dans le dossier de
 * l'ingénieur »). Values are escaped: they are the team's words.
 */
export function briefHtml(input: {
  project: string;
  titles: string[];
  state: string;
  brief: MasterBrief;
  dates: Record<(typeof BRIEF_DATES)[number], string | null>;
  mix: string | null;
  mastering: string | null;
  validator: string | null;
}): string {
  const b = input.brief;
  const row = (label: string, value: string | null) =>
    `<tr><th>${esc(label)}</th><td>${value ? esc(value).replace(/\n/g, "<br>") : `<span class="none">${esc(t.pdf.none)}</span>`}</td></tr>`;
  const section = (title: string, rows: string) =>
    `<h2>${esc(title)}</h2><table>${rows}</table>`;
  const deliverables = b.deliverables
    .map((d) => fr.masterWorkflow.brief.deliverables[d])
    .join(", ");
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${esc(t.pdf.title(input.project))}</title><style>
body{font-family:system-ui,sans-serif;font-size:12px;color:#111;margin:32px}
h1{font-size:20px;margin:0 0 4px}p.state{color:#555;margin:0 0 16px}
h2{font-size:14px;margin:18px 0 6px;text-transform:uppercase;letter-spacing:.04em;color:#444}
table{width:100%;border-collapse:collapse}
th,td{text-align:left;padding:5px 6px;border-bottom:1px solid #ddd;vertical-align:top}
th{width:34%;font-weight:600}.none{color:#888}
</style></head><body><h1>${esc(t.pdf.title(input.project))}</h1><p class="state">${esc(
    [input.titles.map((x) => `« ${x} »`).join(", "), input.state]
      .filter(Boolean)
      .join(" · "),
  )}</p>${section(
    t.sections.conditions,
    row(t.fields.mix, input.mix) +
      row(
        t.fields.mastering,
        b.masteringSameEngineer ? input.mix : input.mastering,
      ) +
      row(
        t.fields.revisions,
        b.revisions === null ? null : t.revisions(b.revisions),
      ) +
      row(t.fields.validator, input.validator),
  )}${section(
    t.sections.direction,
    row(t.fields.direction, b.direction) +
      row(t.fields.references, b.references) +
      row(t.fields.constraints, b.constraints),
  )}${section(
    t.sections.deliverables,
    row(t.fields.deliverables, deliverables || null) +
      row(t.fields.formats, b.formats),
  )}${section(
    t.sections.dates,
    BRIEF_DATES.map((key) =>
      row(
        t.fields[key],
        input.dates[key] ? formatDay(input.dates[key]!) : null,
      ),
    ).join(""),
  )}${section(t.sections.message, row(t.fields.message, b.message))}</body></html>`;
}
