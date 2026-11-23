import "server-only";

import type { Access } from "@/lib/auth/access";
import { can } from "@/lib/auth/access";
import { routes } from "@/lib/auth/redirects";
import { dealOfAddress } from "@/lib/email/deal-memo-address";
import { clearanceOfAddress } from "@/lib/email/reply-address";
import { isProofsAddress } from "@/lib/finance/proof-address";
import { mailbox } from "@/lib/i18n/fr/mailbox";
import type { MailboxLink } from "@/lib/mailbox/types";
import { createClient } from "@/lib/supabase/server";

type Addressed = { to: string[]; cc: string[] };

const addresses = (mail: Addressed) => [...mail.to, ...mail.cc];

const clearanceIdOf = (mail: Addressed) =>
  addresses(mail)
    .map((address) => clearanceOfAddress(address))
    .find((id): id is string => id !== null) ?? null;

/**
 * Where PDS OS filed each mail, read from the address it was sent to
 * (po+deal-<id>@, po+aut-<id>@, po+justificatifs@): the deal, the
 * authorisation request, Finance's proofs (only for who reads Finance).
 * Computed by code at each reading, in the viewer's session (RLS: a
 * request they cannot read has no link). One read for all the requests.
 */
export async function mailLinks(
  mails: Addressed[],
  access: Access,
): Promise<(MailboxLink | null)[]> {
  const clearanceIds = [
    ...new Set(
      mails.flatMap((mail) => {
        const id = clearanceIdOf(mail);
        return id ? [id] : [];
      }),
    ),
  ];
  const projects = new Map<string, string>();
  if (clearanceIds.length > 0) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("legal_clearances")
      .select("id, project_id")
      .in("id", clearanceIds);
    if (error) console.error("mailLinks (clearances):", error.message);
    for (const row of data ?? []) projects.set(row.id, row.project_id);
  }
  const t = mailbox.links;
  const proofs = can(access, "read_finance");

  return mails.map((mail): MailboxLink | null => {
    const deal = addresses(mail)
      .map((address) => dealOfAddress(address))
      .find((id): id is string => id !== null);
    if (deal) return { href: routes.deal(deal), label: t.deal };
    const clearance = clearanceIdOf(mail);
    const project = clearance ? projects.get(clearance) : undefined;
    if (clearance && project)
      return {
        href: `${routes.projectLegalStep(project, "clearances")}?emprunt=${clearance}`,
        label: t.clearance,
      };
    if (proofs && addresses(mail).some(isProofsAddress))
      return { href: routes.financeReceipts, label: t.proofs };
    return null;
  });
}
