import "server-only";

import { idOfPlusAddress, plusAddress } from "@/lib/email/plus-address";

// PO's address of one authorisation request: po+aut-<clearance id>@domain.
// Gmail delivers it to po@ (plus addressing, on by default on Workspace);
// a reply to the request arrives with it, which says which request it
// answers without reading anything (lib/legal/clearance/inbox-replies.ts).
const TAG = "aut-";

/** PO's address of a clearance, null without PO's account. */
export const clearanceReplyAddress = (clearanceId: string) =>
  plusAddress(TAG, clearanceId);

/** The clearance an address is PO's address of (po+aut-<id>@…), else null. */
export const clearanceOfAddress = (address: string) =>
  idOfPlusAddress(TAG, address);
