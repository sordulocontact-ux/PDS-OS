// What each field of a template reads, and from where (« L'écran distingue
// Rempli automatiquement et Manquant avec la source de chaque valeur »).
// Pure: the code decides every value, never the model (CLAUDE.md rule 6).

import type { ContributorRole } from "@/lib/catalog/master/rules";
import { legalContracts } from "@/lib/i18n/fr/legal-contracts";
import { legalForms } from "@/lib/i18n/fr/legal-forms";
import { masterPage } from "@/lib/i18n/fr/master-page";
import {
  CONTRACT_FIELD_IDS,
  formatFee,
  type ContractFieldId,
  type FieldSource,
} from "@/lib/legal/contracts/fields";
import type { ContractLanguage } from "@/lib/legal/contracts/language";

const fr = { legalContracts, legalForms, masterPage };

export type ValueContext = {
  contact: { name: string; email: string | null; phone: string | null };
  // contact_legal_details.details: what the person's fiche gave.
  details: Record<string, string>;
  creditRoles: ContributorRole[];
  titles: string[];
  project: { title: string; artistName: string | null };
  feeCents: number | null;
  organizationName: string | null;
  // The template's language (Ibé, 18/11/2026): what the code writes itself
  // (« Sans objet », status, roles, amount) is written in it. French when
  // unknown.
  language?: ContractLanguage;
};

export type FieldValue = {
  value: string;
  source: FieldSource;
  // JUR-16: not asked for this person (« Sans objet » in the contract).
  notApplicable?: true;
} | null;

const notApplicableIn = (language: ContractLanguage): FieldValue => ({
  value:
    language === "en"
      ? fr.legalContracts.inEnglish.notApplicable
      : fr.legalContracts.notApplicable,
  source: "fiche",
  notApplicable: true,
});

// « €1,500.00 excl. VAT »: the same amount, written the English way.
const feeIn = (cents: number, language: ContractLanguage) =>
  language === "en"
    ? `${new Intl.NumberFormat("en-GB", {
        style: "currency",
        currency: "EUR",
      }).format(cents / 100)} excl. VAT`
    : formatFee(cents);

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
  const language = ctx.language ?? "fr";
  const en = language === "en";
  const notApplicable = notApplicableIn(language);
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
      return from(
        en
          ? fr.legalContracts.inEnglish.entityType[d.entity_type]
          : fr.legalForms.options.entity_type[d.entity_type],
        "fiche",
      );
    // Acting as a person: no company, no SIREN. No collecting society: no
    // IPI (JUR-16). Said by their fiche, never supposed.
    case "personne.societe":
      return d.entity_type === "person"
        ? notApplicable
        : from(d.company_name, "fiche");
    case "personne.siret":
      return d.entity_type === "person"
        ? notApplicable
        : from(d.siret, "fiche");
    case "personne.ipi":
      return d.management_org === "none"
        ? notApplicable
        : from(d.ipi_coad, "fiche");
    case "personne.roles":
      return from(
        ctx.creditRoles
          .map((role) =>
            en
              ? (fr.legalContracts.inEnglish.roles[role] ?? role)
              : fr.masterPage.credits.roles[role],
          )
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
      return ctx.feeCents
        ? from(feeIn(ctx.feeCents, language), "mapping")
        : null;
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
