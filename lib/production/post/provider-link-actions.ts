"use server";

import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { projectTitleOf } from "@/lib/email/outcome";
import { emailProviderLink } from "@/lib/email/provider-email";
import { fr } from "@/lib/i18n/fr";
import { prepDone } from "@/lib/production/prep-result";
import { createClient } from "@/lib/supabase/server";

// « Lien du prestataire » (PROD-026): the owner creates a provider's
// private link; the token comes back once and is never stored (only its
// hash, create_production_provider_link). A new link replaces the former.
// PDS OS e-mails it itself when it can (SMTP and an address in the Réseau,
// Sacha 05/11/2026); else it is shown once to copy, as before.

const schema = z.object({
  projectId: z.uuid(),
  sheetId: z.uuid(),
  contactId: z.uuid(),
});

export async function createProviderLink(
  input: z.input<typeof schema>,
): Promise<
  | { ok: true; token: string; emailed: "sent" | "failed" | "disabled" }
  | { ok: false; error: string }
> {
  await requireApproved();
  const parsed = schema.safeParse(input);
  const t = fr.productionProvider;
  if (!parsed.success) return { ok: false, error: t.failed };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    "create_production_provider_link",
    { p_sheet_id: parsed.data.sheetId, p_contact_id: parsed.data.contactId },
  );
  if (error || !data) {
    if (error?.message.includes("not_a_provider"))
      return { ok: false, error: t.notAProvider };
    console.error("createProviderLink:", error?.message);
    return { ok: false, error: t.failed };
  }
  prepDone(parsed.data.projectId);
  const emailed = await emailProviderLink({
    contactId: parsed.data.contactId,
    token: data,
    subject: t.email.subject(await projectTitleOf(parsed.data.projectId)),
    body: t.email.body,
    open: t.email.open,
  });
  return { ok: true, token: data, emailed };
}
