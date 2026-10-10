import { fr } from "@/lib/i18n/fr";

const roles: Record<string, string> = fr.productionNeeds.roles;

/** A preset position's label; an unknown key stays as written. */
export const roleLabel = (roleKey: string): string => roles[roleKey] ?? roleKey;

/** « Musicien · Guitare », « Cadre / prise de vues », or the label of an
 * « Autre » position. */
export function needLabel(need: {
  roleKey: string;
  label: string | null;
  speciality: string | null;
}): string {
  const base =
    need.roleKey === "other" && need.label
      ? need.label
      : roleLabel(need.roleKey);
  return need.speciality ? `${base} · ${need.speciality}` : base;
}
