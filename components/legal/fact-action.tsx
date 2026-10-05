import { DeclarationRowActions } from "@/components/legal/declaration-row-actions";
import { DeclareButton } from "@/components/legal/declare-button";
import { SplitsEditorButton } from "@/components/legal/splits-editor-button";
import { AddToNetworkButton } from "@/components/network/add-to-network-button";
import { LinkContactButton } from "@/components/network/link-contact-button";
import type { LegalFactAction } from "@/lib/legal/types";

/** The control of a row's action (decided by the server): one per kind. */
export function FactAction({ action }: { action: LegalFactAction }) {
  switch (action.kind) {
    case "add_to_network":
      return <AddToNetworkButton action={action} />;
    case "link_contact":
      return <LinkContactButton action={action} />;
    case "edit_splits":
      return <SplitsEditorButton action={action} />;
    case "declare":
      return (
        <DeclareButton
          row
          titles={[{ id: action.masterId, title: action.title }]}
          declared={{}}
        />
      );
    case "edit_declaration":
      return <DeclarationRowActions action={action} />;
  }
}
