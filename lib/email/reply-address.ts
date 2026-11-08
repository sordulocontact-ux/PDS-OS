import "server-only";

import { getServerEnv } from "@/lib/env";

// PO's address of one authorisation request: po+aut-<clearance id>@domain.
// Gmail delivers it to po@ (plus addressing, on by default on Workspace);
// a reply to the request arrives with it, which says which request it
// answers without reading anything (lib/legal/clearance/inbox-replies.ts).
const TAG = "aut-";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** PO's reply address of a request, null without PO's account. */
export function clearanceReplyAddress(clearanceId: string): string | null {
  const user = getServerEnv().EMAIL_SMTP_USER;
  if (!user) return null;
  const [local, domain] = user.split("@");
  return `${local}+${TAG}${clearanceId}@${domain}`;
}

/** The request an address answers (po+aut-<id>@…), null for any other. */
export function clearanceOfAddress(address: string): string | null {
  const user = getServerEnv().EMAIL_SMTP_USER;
  if (!user) return null;
  const [local, domain] = user.toLowerCase().split("@");
  const [box, host] = address.trim().toLowerCase().split("@");
  if (host !== domain || !box?.startsWith(`${local}+${TAG}`)) return null;
  const id = box.slice(`${local}+${TAG}`.length);
  return UUID.test(id) ? id : null;
}
