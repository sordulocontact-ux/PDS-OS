import { fr } from "@/lib/i18n/fr";
import {
  isChoiceField,
  type ImportBriefField,
  type ImportNeedProposal,
} from "@/lib/production/import-proposal";

// Words of an imported proposal, taken from the brief's and the teams' own
// texts (lib/i18n/fr/production-brief.ts, production-needs.ts).

export function briefTitle(field: ImportBriefField): string {
  const t = fr.productionBrief;
  return isChoiceField(field) ? t.choiceLegends[field] : t.fields[field].label;
}

export function briefValue(field: ImportBriefField, value: string): string {
  if (!isChoiceField(field)) return value;
  const labels = fr.productionBrief.choices[field] as Record<
    string,
    { label: string }
  >;
  return labels[value]?.label ?? value;
}

/** « Musicien · Guitare », « Autre » showing its own label. */
export function needTitle(
  need: Pick<ImportNeedProposal, "roleKey" | "label" | "speciality">,
): string {
  const role =
    need.roleKey === "other" && need.label
      ? need.label
      : fr.productionNeeds.roles[need.roleKey];
  return need.speciality ? `${role} · ${need.speciality}` : role;
}
