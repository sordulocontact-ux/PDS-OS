import type { DossierSection } from "@/lib/distribution/delivery-file";
import { fr } from "@/lib/i18n/fr";

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

/**
 * The delivery file as a printable page (lib/pdf/render.ts): its sections,
 * each value with its source, as the screen shows it. Values are escaped:
 * they come from the sources, never trusted as markup.
 */
export function dossierHtml(input: {
  title: string;
  number: number;
  state: string;
  sections: DossierSection[];
}): string {
  const t = fr.distributionJourney.dossier;
  const d = fr.distribution.dossier;
  const rows = input.sections
    .map(
      (section) =>
        `<h2>${esc(section.title)}</h2>${section.groups
          .map(
            (group) =>
              `${group.title ? `<h3>${esc(group.title)}</h3>` : ""}<table>${group.fields
                .map(
                  (f) =>
                    `<tr><th>${esc(f.label)}</th><td>${esc(f.value ?? t.missing)}</td><td class="src">${esc(d.origins[f.origin])}</td></tr>`,
                )
                .join("")}</table>`,
          )
          .join("")}`,
    )
    .join("");
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${esc(t.document(input.number))}</title><style>
body{font-family:system-ui,sans-serif;font-size:12px;color:#111;margin:32px}
h1{font-size:20px;margin:0 0 4px}p.state{color:#555;margin:0 0 16px}
h2{font-size:14px;margin:18px 0 6px;text-transform:uppercase;letter-spacing:.04em;color:#444}
h3{font-size:12px;margin:8px 0 4px}table{width:100%;border-collapse:collapse}
th,td{text-align:left;padding:5px 6px;border-bottom:1px solid #ddd;vertical-align:top}
th{width:32%;font-weight:600}td.src{width:22%;color:#666}
</style></head><body><h1>${esc(input.title)} · ${esc(t.document(input.number))}</h1><p class="state">${esc(input.state)}</p>${rows}</body></html>`;
}
