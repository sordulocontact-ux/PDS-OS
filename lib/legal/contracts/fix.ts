// Where a contract's value is fixed (JUR-16 « lien d'action », JUR-10 « ouvrir
// la fiche exacte … et proposer un retour au contrat »): the person's fiche
// in their démarche, their Réseau contact (back to the démarche), the
// credits in the État des lieux. The fee is changed on its line (no link).
// Never the former /legal/forms or /legal/contracts pages, which only lead
// back to the same démarche (Sacha, 06/11/2026: « Compléter recharge la
// page »). Client-safe.

import { routes } from "@/lib/auth/redirects";
import { legalContracts } from "@/lib/i18n/fr/legal-contracts";
import type {
  AgreementField,
  AgreementRow,
} from "@/lib/legal/contracts/mapping";
import { legalDemarcheHref } from "@/lib/ui/legal-steps";
import { withReturn } from "@/lib/ui/return-to";

const fr = { legalContracts };

export type ValueFix = { href: string; label: string } | null;

/** The person's démarche, opened on their fiche (`?partie=fiche`). */
export const ficheOfDemarche = (projectId: string, personKey: string) =>
  `${legalDemarcheHref(projectId, "person", personKey)}?partie=fiche`;

export function contractFix(
  row: Pick<AgreementRow, "key" | "contactId">,
  projectId: string,
) {
  const c = fr.legalContracts.checklist.fixAt;
  const back = legalDemarcheHref(projectId, "person", row.key);
  return (field: AgreementField): ValueFix => {
    switch (field.home) {
      case "fiche":
        return { href: ficheOfDemarche(projectId, row.key), label: c.fiche };
      case "network":
        return row.contactId
          ? {
              href: withReturn(routes.networkContact(row.contactId), back),
              label: c.network,
            }
          : null;
      case "credits":
        return {
          href: routes.projectLegalStep(projectId, "inventory"),
          label: c.credits,
        };
      default:
        return null;
    }
  };
}
