import "server-only";

import { sendEmail } from "@/lib/email/send";
import { getPublicEnv } from "@/lib/env";
import { masterRound } from "@/lib/i18n/fr/master-round";
import { createClient } from "@/lib/supabase/server";
import { formatDay } from "@/lib/utils/day";

const t = masterRound.email;

// The package's card on the person's page (masterPortalCards).
export const PACKAGE_ANCHOR = "ps-package";

/**
 * The e-mail of a package just sent (proto `master-v2.html`, « L'e-mail que
 * PDS OS enverra »): the message written by the owner, then the engineer's
 * page by project opened on the package (`link`, lot 11: one link for all
 * PDS expects from them), from PO's address in the owner's name. Without
 * that page, the package's own link. Both are then marked as sent; a
 * mastering added to the mix link reuses that link, already marked.
 * « failed »: the package left, the e-mail did not — the link stays to
 * copy, « Marquer comme envoyé » too.
 */
export async function emailTransmission(input: {
  projectId: string;
  role: "mix" | "mastering";
  project: string;
  engineer: { name: string; email: string };
  message: string;
  sender: { name: string; email: string | null };
  link: { id: string; token: string } | null;
}): Promise<"sent" | "failed"> {
  const supabase = await createClient();
  const { data: row } = await supabase
    .from("master_transmissions")
    .select("id, continues_id, expires_at")
    .eq("project_id", input.projectId)
    .eq("role", input.role)
    .is("revoked_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!row) return "failed";
  const site = getPublicEnv().NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  let url = input.link
    ? `${site}/c/${input.link.token}#${PACKAGE_ANCHOR}`
    : null;
  if (!url) {
    const { data: token } = await supabase.rpc("master_transmission_link", {
      p_transmission_id: row.continues_id ?? row.id,
    });
    if (!token) return "failed";
    url = `${site}/m/${token}`;
  }

  const message =
    input.message.trim() ||
    t.defaultMessage(input.engineer.name, input.project, input.role);
  const sent = await sendEmail({
    to: input.engineer,
    subject: t.subjectValue(input.project, input.role),
    text: `${message}\n\n${t.open} ${url}\n${t.validity(formatDay(row.expires_at))}\n\n${t.signature(input.sender.name)}\n`,
    sender: input.sender,
  });
  if (!sent.ok) return "failed";
  const marks = await Promise.all([
    row.continues_id
      ? null
      : supabase.rpc("mark_master_transmission_sent", {
          p_transmission_id: row.id,
        }),
    input.link
      ? supabase.rpc("mark_contact_link_sent", { p_link_id: input.link.id })
      : null,
  ]);
  for (const mark of marks)
    if (mark?.error)
      console.error(
        "emailTransmission mark:",
        mark.error.code,
        mark.error.message,
      );
  return "sent";
}
