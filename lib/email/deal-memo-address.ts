import "server-only";

import { idOfPlusAddress, plusAddress } from "@/lib/email/plus-address";

// PO's address of one deal: po+deal-<deal id>@domain (plus addressing, as
// the authorisation requests' po+aut-<id>@, lib/email/reply-address.ts). The
// label or the brand sends its deal memo there, or the business manager
// forwards it there: which deal it belongs to is then known without
// reading anything (lib/email/deal-memo-inbox.ts).
const TAG = "deal-";

/** PO's address of a deal, null without PO's account. */
export const dealMemoAddress = (dealId: string) => plusAddress(TAG, dealId);

/** The deal an address is PO's address of (po+deal-<id>@…), else null. */
export const dealOfAddress = (address: string) => idOfPlusAddress(TAG, address);
