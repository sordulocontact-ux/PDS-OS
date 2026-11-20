import "server-only";

import { getServerEnv } from "@/lib/env";

// PO's address of one deal: po+deal-<deal id>@domain (plus addressing, as
// the authorisation requests' po+aut-<id>@, lib/email/reply-address.ts). The
// label or the brand sends its deal memo there, or the business manager
// forwards it there: which deal it belongs to is then known without
// reading anything (lib/email/deal-memo-inbox.ts).
const TAG = "deal-";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** PO's address of a deal, null without PO's account. */
export function dealMemoAddress(dealId: string): string | null {
  const user = getServerEnv().EMAIL_SMTP_USER;
  if (!user) return null;
  const [local, domain] = user.split("@");
  return `${local}+${TAG}${dealId}@${domain}`;
}

/** The deal an address is PO's address of (po+deal-<id>@…), else null. */
export function dealOfAddress(address: string): string | null {
  const user = getServerEnv().EMAIL_SMTP_USER;
  if (!user) return null;
  const [local, domain] = user.toLowerCase().split("@");
  const [box, host] = address.trim().toLowerCase().split("@");
  if (host !== domain || !box?.startsWith(`${local}+${TAG}`)) return null;
  const id = box.slice(`${local}+${TAG}`.length);
  return UUID.test(id) ? id : null;
}
