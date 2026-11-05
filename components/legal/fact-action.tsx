import { AddToNetworkButton } from "@/components/network/add-to-network-button";
import { LinkContactButton } from "@/components/network/link-contact-button";
import type { LegalFactAction, LegalRowEdit } from "@/lib/legal/types";

/** The button beside a row (decided by the server): add a credit's person
 * to the Réseau, or link it to a namesake. The other actions open from a
 * click on the row itself (`InventoryEditRow`). */
export function FactAction({
  action,
}: {
  action: Exclude<LegalFactAction, LegalRowEdit>;
}) {
  switch (action.kind) {
    case "add_to_network":
      return <AddToNetworkButton action={action} />;
    case "link_contact":
      return <LinkContactButton action={action} />;
  }
}
