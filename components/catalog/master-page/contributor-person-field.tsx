"use client";

import { PersonPickerField } from "@/components/network/person-picker-field";
import type { ContributorRole } from "@/lib/catalog/master/rules";
import { masterPage } from "@/lib/i18n/fr/master-page";
import { NETWORK_ROLE_OF } from "@/lib/legal/people-facts";
import {
  listNetworkPeople,
  type NetworkPersonOption,
} from "@/lib/network/people-actions";

const fr = { masterPage };

/** Who a credit names (Sacha, 05/10/2026): a person of the Réseau (the
 * credit then created linked), added to it, or only a name. `onPick`: the
 * person chosen, so the form takes their roles from the Réseau. `load`:
 * shared by the rows of one form (usePickerLoad). */
export function ContributorPersonField({
  defaultName,
  defaultContactId,
  roles,
  onPick,
  load = () => listNetworkPeople(),
  fieldPrefix = "",
  error,
}: {
  defaultName: string | null;
  defaultContactId: string | null;
  // The credit's roles: a contact added from here takes them in the Réseau.
  roles: ContributorRole[];
  onPick?: (option: NetworkPersonOption | null, name: string) => void;
  load?: (fresh?: boolean) => Promise<NetworkPersonOption[]>;
  // Several on one form (« Nouveau titre »): their own input names.
  fieldPrefix?: string;
  error?: string;
}) {
  return (
    <PersonPickerField<NetworkPersonOption>
      refName={`${fieldPrefix}contactId`}
      nameName={`${fieldPrefix}name`}
      legend={fr.masterPage.credits.person}
      required
      load={load}
      defaultRef={defaultContactId}
      defaultName={defaultName}
      createRoles={[...new Set(roles.map((role) => NETWORK_ROLE_OF[role]))]}
      refOfContact={(id) => id}
      onPick={onPick}
      error={error}
    />
  );
}
