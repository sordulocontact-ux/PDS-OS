// The external brief of a collaboration, written by code from what is
// validated (ticket Influence § 7 : « Le brief externe reprend uniquement les
// informations validées et autorisées »). Client-safe.

import type { InfluenceData } from "@/lib/activations/influence/queries";
import type { SheetVersion } from "@/lib/activations/sheets";
import { fr } from "@/lib/i18n/fr";

const t = fr.activationInfluence;
const fields = fr.activationWork.sheet.fields;

/** Concept (the collaboration's validated one, else the generic validated
 * one), accepted terms, current rights. Nothing not validated goes in. */
export function composeBrief(
  campaign: string,
  concept: SheetVersion | undefined,
  terms: InfluenceData["proposals"][number] | undefined,
  rights: InfluenceData["rights"],
): { subject: string; body: string } {
  const lines: string[] = [];
  if (concept?.status === "validated") {
    lines.push(`${t.brief.concept}`);
    for (const [key, value] of Object.entries(concept.fields))
      if (value?.value)
        lines.push(`${fields[key as keyof typeof fields]} : ${value.value}`);
  }
  if (terms?.accepted_at) {
    lines.push("", t.brief.terms);
    if (terms.deliverables)
      lines.push(`${t.negotiation.deliverables} : ${terms.deliverables}`);
    if (terms.schedule)
      lines.push(`${t.negotiation.schedule} : ${terms.schedule}`);
    if (terms.conditions)
      lines.push(`${t.negotiation.conditions} : ${terms.conditions}`);
  }
  const current = rights.filter(
    (r) => !r.superseded_at && r.status !== "refused" && r.status !== "revoked",
  );
  if (current.length > 0) {
    lines.push("", t.brief.rights);
    for (const r of current)
      lines.push(
        `${t.rights.kinds[r.kind as "organic" | "ads"]} (${t.rights.statuses[r.status as "proposed" | "accepted"]}) : ${[r.platforms.join(", "), r.territory, r.restrictions].filter(Boolean).join(" · ")}`,
      );
  }
  lines.push("", t.brief.validation);
  return {
    subject: t.brief.subject(campaign),
    body: lines.length > 2 ? lines.join("\n").trim() : t.brief.missing,
  };
}
