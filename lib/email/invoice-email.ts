import "server-only";

import { emailContact } from "@/lib/email/contact-email";
import { projectTitleOf } from "@/lib/email/outcome";
import { invoices } from "@/lib/i18n/fr/invoices";
import { createClient } from "@/lib/supabase/server";

const t = invoices.requestEmail;

// An invoice is asked by SQL, the moment a gesture lands (the last Master
// final, a contract signed): the person deposits it on their page. Right
// after the gesture, these find who was just asked, so PDS OS can say it
// by e-mail (Sacha, 05/11/2026) instead of the team doing it by hand.
const JUST_NOW_MS = 2 * 60 * 1000;

/** The people asked for an invoice by this gesture (still unreceived),
 * from the ones made in the last minutes. */
export async function justAskedInvoices(
  projectId: string,
  where: { origin: "master" } | { contractId: string },
): Promise<string[]> {
  const supabase = await createClient();
  const query = supabase
    .from("project_invoices")
    .select("contact_id")
    .eq("project_id", projectId)
    .is("received_at", null)
    .gte("requested_at", new Date(Date.now() - JUST_NOW_MS).toISOString());
  const { data } = await ("contractId" in where
    ? query.eq("contract_id", where.contractId)
    : query.eq("origin", where.origin));
  return [...new Set((data ?? []).map((r) => r.contact_id))];
}

/** « Votre facture se dépose sur votre page »: one e-mail to the person. */
export async function emailInvoiceRequest(
  projectId: string,
  contactId: string,
): Promise<"sent" | "failed" | "disabled"> {
  const title = await projectTitleOf(projectId);
  return emailContact({
    projectId,
    contactId,
    subject: t.subject(title),
    body: t.body,
    open: t.open,
  });
}
