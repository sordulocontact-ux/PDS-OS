// What each field of a template reads, and from where (« L'écran distingue
// Rempli automatiquement et Manquant avec la source de chaque valeur »).
// Pure: the code decides every value, never the model (CLAUDE.md rule 6).

import type { ContributorRole } from "@/lib/catalog/master/rules";
import { fr } from "@/lib/i18n/fr";
import {
  CONTRACT_FIELD_IDS,
  formatFee,
  type ContractFieldId,
  type FieldSource,
} from "@/lib/legal/contracts/fields";

export type ValueContext = {
  contact: { name: string; email: string | null; phone: string | null };
  // contact_legal_details.details: what the person's fiche gave.
  details: Record<string, string>;
  creditRoles: ContributorRole[];
  titles: string[];
  project: { title: string; artistName: string | null };
  feeCents: number | null;
  organizationName: string | null;
};

export type FieldValue = { value: string; source: FieldSource } | null;

const text = (value: string | null | undefined) => {
  const clean = value?.trim();
  return clean ? clean : null;
};

const from = (value: string | null | undefined, source: FieldSource) => {
  const clean = text(value);
  return clean ? { value: clean, source } : null;
};

function read(id: ContractFieldId, ctx: ValueContext): FieldValue {
  const d = ctx.details;
  switch (id) {
    case "personne.nom_civil":
      return from(
        [text(d.legal_first_name), text(d.legal_last_name)]
          .filter(Boolean)
          .join(" "),
        "fiche",
      );
    case "personne.nom_artiste":
      return from(d.pseudonym, "fiche") ?? from(ctx.contact.name, "network");
    case "personne.email":
      return from(d.email, "fiche") ?? from(ctx.contact.email, "network");
    case "personne.telephone":
      return from(d.phone, "fiche") ?? from(ctx.contact.phone, "network");
    case "personne.adresse":
      return from(d.address, "fiche");
    case "personne.statut":
      return from(fr.legalForms.options.entity_type[d.entity_type], "fiche");
    case "personne.societe":
      return from(d.company_name, "fiche");
    case "personne.siret":
      return from(d.siret, "fiche");
    case "personne.ipi":
      return from(d.ipi_coad, "fiche");
    case "personne.roles":
      return from(
        ctx.creditRoles
          .map((role) => fr.masterPage.credits.roles[role])
          .join(", "),
        "credits",
      );
    case "projet.titre":
      return from(ctx.project.title, "project");
    case "projet.artiste":
      return from(ctx.project.artistName, "project");
    case "projet.titres":
      return from(ctx.titles.join(", "), "credits");
    case "remuneration":
      return ctx.feeCents ? from(formatFee(ctx.feeCents), "mapping") : null;
    case "organisation.nom":
      return from(ctx.organizationName, "organization");
  }
}

export function fieldValues(
  ctx: ValueContext,
): Record<ContractFieldId, FieldValue> {
  return Object.fromEntries(
    CONTRACT_FIELD_IDS.map((id) => [id, read(id, ctx)]),
  ) as Record<ContractFieldId, FieldValue>;
}
