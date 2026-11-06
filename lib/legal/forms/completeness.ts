// What a contract needs from a received fiche (JUR-06): « une fiche reçue
// n'est pas automatiquement complète ». The legal name, an e-mail, an
// address (a company: its name, SIREN/SIRET and billing address) and, for
// an author, a composer or an arranger, their IPI/COAD number. Pure and
// client-safe: the team's page, the server action and the person's
// complement card share it. Bank details are not asked here: the invoice
// carries them (lib/invoices).

import type { FormSubmission } from "@/lib/legal/forms/queries";

const CREATORS = new Set(["author", "composer", "arranger"]);

const filled = (values: Record<string, string>, id: string) =>
  (values[id] ?? "").trim() !== "";

/** What the contract needs from this person, in the fiche's order: the
 * fields the public fiche asks as required (« * », Sacha 06/11/2026: no
 * fiche sent without what the contract needs) and the team checks. */
export function ficheNeeded(
  roles: readonly string[],
  person: Record<string, string>,
): string[] {
  return [
    "legal_first_name",
    "legal_last_name",
    "email",
    ...(person.entity_type === "company"
      ? ["company_name", "siret", "billing"]
      : ["address"]),
    ...(roles.some((r) => CREATORS.has(r)) ? ["ipi_coad"] : []),
  ];
}

/** The fields still missing for the contract, in the fiche's order. */
export function ficheMissing(
  submission: Pick<FormSubmission, "roles" | "person">,
): string[] {
  const p = submission.person;
  return ficheNeeded(submission.roles, p).filter((id) => !filled(p, id));
}
