import "server-only";

import { getServerEnv } from "@/lib/env";

// The box of proofs' address: po+justificatifs@domain. Gmail delivers it to
// po@ (plus addressing, as po+aut-<id>@, lib/email/reply-address.ts); the
// cron files what arrives on it (lib/finance/proof-email.ts).
const TAG = "justificatifs";

/** Where the team forwards its tickets and invoices; null without PO's
 * account. */
export function proofsAddress(): string | null {
  const user = getServerEnv().EMAIL_SMTP_USER?.toLowerCase();
  if (!user?.includes("@")) return null;
  const [local, domain] = user.split("@");
  return `${local}+${TAG}@${domain}`;
}

export const isProofsAddress = (address: string) =>
  address.trim().toLowerCase() === proofsAddress();
