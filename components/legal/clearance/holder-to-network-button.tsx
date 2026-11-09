"use client";

import { ContactForm } from "@/components/network/contact-form";
import { useLegalAction } from "@/components/legal/use-legal-action";
import { LoadedFormButton } from "@/components/ui/loaded-form-button";
import { facts } from "@/lib/i18n/fr/facts";
import { legalClearance } from "@/lib/i18n/fr/legal-clearance";
import { network } from "@/lib/i18n/fr/network";
import { linkClearanceHolder } from "@/lib/legal/clearance/link-actions";
import type { HolderRole } from "@/lib/legal/clearance/matrix";
import type { NetworkRole } from "@/lib/network/types";
import { loadContactOptions } from "@/lib/network/actions";

const fr = { facts, legalClearance, network };

// The role of the Réseau a holder's role suggests.
const ROLES: Record<HolderRole, NetworkRole[]> = {
  publisher: ["publisher"],
  author: ["songwriter"],
  composer: ["songwriter"],
  producer: ["production_company"],
  label: ["label"],
  other: [],
};

/**
 * « Ajouter au Réseau » on a rights holder kept by name only (Sacha,
 * 09/11/2026): the usual contact form, filled with their name, the role
 * their right suggests and the address the request went to; saved, the
 * fiche is linked to the borrowing and the card reads their fiche.
 */
export function HolderToNetworkButton({
  projectId,
  holderId,
  name,
  role,
  email,
}: {
  projectId: string;
  holderId: string;
  name: string;
  role: string;
  email: string | null;
}) {
  const t = fr.network.form;
  const { run } = useLegalAction();
  return (
    <LoadedFormButton
      dialogSize="medium"
      label={fr.facts.addToNetwork}
      variant="outline"
      size="sm"
      title={t.createTitle}
      description={t.createDescription}
      closeLabel={t.close}
      load={loadContactOptions}
    >
      {(options, close) => (
        <ContactForm
          options={options}
          initial={{
            name,
            roles: ROLES[role as HolderRole] ?? [],
            email,
          }}
          stay
          onCancel={close}
          onSaved={(contactId) =>
            run(
              () => linkClearanceHolder({ projectId, holderId, contactId }),
              close,
              fr.legalClearance.request.linked(name),
            )
          }
        />
      )}
    </LoadedFormButton>
  );
}
