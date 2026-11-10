import "server-only";

import { emailContact } from "@/lib/email/contact-email";
import { signedReturns } from "@/lib/i18n/fr/signed-returns";
import { ensureContactLink } from "@/lib/portal/ensure-contact-link";
import { createClient } from "@/lib/supabase/server";

const t = signedReturns.sacem.auto;

type Signer = { contact_id: string | null; house: boolean };

/**
 * Each signer of the bulletin's version to sign gets their page by project
 * (/c/, lot 11) and an e-mail when PDS OS can send one (Sacha, 10/11/2026:
 * « ils doivent se créer automatiquement », as a contract sent on the
 * person's link; « l'e-mail automatique partout », 05/11/2026). PDS Éditions
 * signs in PDS OS, and a signer without a Réseau contact has no page. Never
 * fails the gesture that called it: a signer's link card still offers
 * « Créer le lien ». Says how many pages are ready.
 */
export async function openSignerPages(
  projectId: string,
  formalityId: string,
): Promise<number> {
  const supabase = await createClient();
  const [{ data: formality }, { data: version }] = await Promise.all([
    supabase
      .from("legal_formalities")
      .select("master_id")
      .eq("id", formalityId)
      .maybeSingle(),
    supabase
      .from("legal_formality_documents")
      .select("version")
      .eq("formality_id", formalityId)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (!formality || !version) return 0;
  const query = supabase
    .from("legal_formality_signatures")
    .select("contact_id, house")
    .eq("formality_id", formalityId)
    .eq("document_version", version.version)
    .eq("status", "pending")
    .is("superseded_at", null);
  const [{ data: signers }, { data: master }] = await Promise.all([
    query,
    supabase
      .from("masters")
      .select("title")
      .eq("id", formality.master_id)
      .maybeSingle(),
  ]);
  const contacts = [
    ...new Set(
      ((signers ?? []) as Signer[]).flatMap((s) =>
        s.contact_id && !s.house ? [s.contact_id] : [],
      ),
    ),
  ];
  const title = master?.title ?? "";
  let made = 0;
  for (const contactId of contacts) {
    const link = await ensureContactLink(projectId, contactId);
    if (!link) continue;
    made += 1;
    await emailContact({
      projectId,
      contactId,
      subject: t.subject(title),
      body: t.body(title),
      open: t.open,
    });
  }
  // The pages ready: one per signer with a contact, owner only.
  return made;
}
