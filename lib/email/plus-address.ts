import "server-only";

import { getServerEnv } from "@/lib/env";

// PO's address of one record: po+<tag><id>@domain (plus addressing, on by
// default on Workspace; Gmail delivers it to po@). An e-mail sent there says
// which record it belongs to without reading anything: a deal
// (po+deal-<id>@), an authorisation request (po+aut-<id>@), a contract
// (po+ctr-<id>@).
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** PO's address of a record, null without PO's account. */
export function plusAddress(tag: string, id: string): string | null {
  const user = getServerEnv().EMAIL_SMTP_USER;
  if (!user) return null;
  const [local, domain] = user.split("@");
  return `${local}+${tag}${id}@${domain}`;
}

/** The record an address is PO's address of (po+<tag><id>@…), else null. */
export function idOfPlusAddress(tag: string, address: string): string | null {
  const user = getServerEnv().EMAIL_SMTP_USER;
  if (!user) return null;
  const [local, domain] = user.toLowerCase().split("@");
  const [box, host] = address.trim().toLowerCase().split("@");
  if (host !== domain || !box?.startsWith(`${local}+${tag}`)) return null;
  const id = box.slice(`${local}+${tag}`.length);
  return UUID.test(id) ? id : null;
}
