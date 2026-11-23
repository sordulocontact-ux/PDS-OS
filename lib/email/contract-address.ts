import "server-only";

import { idOfPlusAddress, plusAddress } from "@/lib/email/plus-address";

// PO's address of one contract: po+ctr-<contract id>@domain. The e-mail
// asking for its signature answers to it, so the signed copy sent back is
// filed in the contract (lib/contracts/signed-by-email.ts).
const TAG = "ctr-";

/** PO's reply address of a contract, null without PO's account. */
export const contractReplyAddress = (contractId: string) =>
  plusAddress(TAG, contractId);

/** The contract an address is PO's address of (po+ctr-<id>@…), else null. */
export const contractOfAddress = (address: string) =>
  idOfPlusAddress(TAG, address);
