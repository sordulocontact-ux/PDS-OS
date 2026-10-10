import { ConfirmSourceButton } from "@/components/master-workflow/confirm-source-button";
import { TitleFileButton } from "@/components/master-workflow/title-file-button";
import { TitleFormButton } from "@/components/master-workflow/title-form-button";
import { AddToNetworkButton } from "@/components/network/add-to-network-button";
import { LinkContactButton } from "@/components/network/link-contact-button";
import type { MasterFactAction as Action } from "@/lib/master-workflow/types";

/** The control of a row's action (decided by the server): one per kind. A
 * file needs the organization it is stored under. */
export function MasterFactAction({
  action,
  organizationId,
}: {
  action: Action;
  organizationId: string | null;
}) {
  switch (action.kind) {
    case "add_to_network":
      return <AddToNetworkButton action={action} />;
    case "link_contact":
      return <LinkContactButton action={action} />;
    case "add_audio":
    case "add_stems":
      return organizationId ? (
        <TitleFileButton organizationId={organizationId} action={action} />
      ) : null;
    case "confirm_source":
      return (
        <ConfirmSourceButton action={action} organizationId={organizationId} />
      );
    case "add_session":
    case "credit_engineer":
      return <TitleFormButton action={action} />;
  }
}
