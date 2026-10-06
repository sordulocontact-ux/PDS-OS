import "server-only";

import { fr } from "@/lib/i18n/fr";
import {
  SACEM_725_FIELDS,
  type Creator,
  type Publisher,
} from "@/lib/legal/formalities/definition";

const escape = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

type Content = Record<string, { value: unknown; source: string }>;

function valueText(key: string, value: unknown): string {
  const t = fr.legalFormalities;
  if (value === null || value === undefined || value === "") return "—";
  if (key === "dep_dr")
    return String((value as { choice?: string }).choice || "—");
  if (key === "arrangement") {
    const v = value as { scope?: string; detail?: string };
    return (
      [
        v.scope
          ? t.arrangementScopes[v.scope as keyof typeof t.arrangementScopes]
          : "",
        v.detail,
      ]
        .filter(Boolean)
        .join(" · ") || "—"
    );
  }
  if (key === "publishing_contract") {
    const v = value as { provided?: boolean; rubric_g?: string };
    return v.provided
      ? t.contract.provided
      : `${t.contract.rubricG} : ${v.rubric_g || "—"}`;
  }
  return String(value);
}

/**
 * A version of the SACEM 725 dossier, in the bulletin's order, to transcribe
 * on (or attach to) the official bulletin: the values validated, each with
 * its source. Escaped: the values come from people.
 */
export function formalityHtml({
  title,
  version,
  content,
}: {
  title: string;
  version: number;
  content: Content;
}): string {
  const t = fr.legalFormalities;
  const row = (label: string, value: string, source?: string) =>
    `<tr><th>${escape(label)}</th><td>${escape(value)}</td><td class="src">${escape(source ?? "")}</td></tr>`;
  const simple = SACEM_725_FIELDS.filter(
    (f) => !["creators", "publishers"].includes(f.kind),
  )
    .map((f) =>
      row(
        t.fields[f.key],
        valueText(f.key, content[f.key]?.value),
        content[f.key]?.source,
      ),
    )
    .join("");
  const creators = ((content.creators?.value ?? []) as Creator[])
    .map(
      (c) =>
        `<tr><td>${escape([c.last_name, c.first_name].filter(Boolean).join(" "))}</td><td>${escape(c.pseudonym || "—")}</td><td>${escape(c.ipi || "—")}</td><td>${escape(c.quality ? t.qualities[c.quality] : "—")}</td><td>${escape(c.phono ? `${c.phono.replace(".", ",")} %` : "—")}</td><td>${c.signs ? "✓" : ""}</td></tr>`,
    )
    .join("");
  const publishers = ((content.publishers?.value ?? []) as Publisher[])
    .map(
      (p) =>
        `<tr><td>${escape(p.name)}</td><td>${escape(p.ipi || "—")}</td><td>${escape(p.phono ? `${p.phono.replace(".", ",")} %` : "—")}</td></tr>`,
    )
    .join("");
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<title>${escape(`${t.definitions.SACEM_725_EDITED_WORK} · ${title} · v${version}`)}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Google+Sans+Flex:wght@500;600&display=block">
<style>
* { box-sizing: border-box; margin: 0; }
body { font-family: "Google Sans Flex", system-ui, sans-serif; font-weight: 500; color: #000; font-size: 12px; line-height: 18px; }
h1 { font-size: 20px; line-height: 26px; font-weight: 600; margin-bottom: 4px; }
h2 { font-size: 14px; font-weight: 600; margin: 20px 0 8px; }
p.meta { color: #767676; }
table { width: 100%; border-collapse: collapse; }
th, td { text-align: left; vertical-align: top; padding: 6px 8px; border-bottom: 1px solid #e5e5e5; }
th { width: 34%; color: #555; font-weight: 500; }
td.src { color: #767676; width: 22%; }
thead td { color: #555; }
</style></head><body>
<h1>${escape(t.definitions.SACEM_725_EDITED_WORK)}</h1>
<p class="meta">${escape(`${title} · ${t.page.version(version)}`)}</p>
<h2>${escape(t.sections.work)} · ${escape(t.sections.exploitation)} · ${escape(t.sections.agreements)}</h2>
<table>${simple}</table>
<h2>${escape(t.fields.creators)}</h2>
<table><thead><tr><td>${escape(t.creator.lastName)}</td><td>${escape(t.creator.pseudonym)}</td><td>${escape(t.creator.ipi)}</td><td>${escape(t.creator.quality)}</td><td>${escape(t.creator.phono)}</td><td>${escape(t.creator.signs)}</td></tr></thead>${creators}</table>
${publishers ? `<h2>${escape(t.fields.publishers)}</h2><table><thead><tr><td>${escape(t.publisher.name)}</td><td>${escape(t.publisher.ipi)}</td><td>${escape(t.publisher.phono)}</td></tr></thead>${publishers}</table>` : ""}
</body></html>`;
}
