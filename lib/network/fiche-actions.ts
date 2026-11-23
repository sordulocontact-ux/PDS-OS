"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { emailLink } from "@/lib/email/link-email";
import { emailOutcome } from "@/lib/email/outcome";
import { core } from "@/lib/i18n/fr/core";
import { network } from "@/lib/i18n/fr/network";
import { loadNetworkFiche } from "@/lib/network/fiche";
import { contactAddressOf } from "@/lib/network/private-details";
import { createClient } from "@/lib/supabase/server";
import type { WriteResult } from "@/lib/utils/write-result";

// The gestures on a contact's Réseau fiche (migration 20261123210101): each
// SQL function checks who may manage it (can_manage_contact_fiche).

const t = network.page.networkFiche;
const id = z.uuid();

function failed(where: string, error: { code?: string; message: string }) {
  console.error(`${where}:`, error.code, error.message);
  return {
    ok: false as const,
    error: error.code === "42501" ? t.errors.forbidden : t.errors.failed,
  };
}

/** « Copier le lien »: the link left by hand. */
export async function markNetworkFicheSent(
  contactId: string,
): Promise<WriteResult> {
  const parsed = id.safeParse(contactId);
  if (!parsed.success) return { ok: false, error: t.errors.failed };
  await requireApproved();
  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_network_contact_fiche_sent", {
    p_contact_id: parsed.data,
  });
  if (error) return failed("markNetworkFicheSent", error);
  revalidatePath(routes.networkContact(parsed.data));
  return { ok: true };
}

/** « Nouveau lien »: the former stops working. */
export async function renewNetworkFiche(
  contactId: string,
): Promise<WriteResult> {
  const parsed = id.safeParse(contactId);
  if (!parsed.success) return { ok: false, error: t.errors.failed };
  await requireApproved();
  const supabase = await createClient();
  const { error } = await supabase.rpc("renew_network_contact_fiche", {
    p_contact_id: parsed.data,
  });
  if (error) return failed("renewNetworkFiche", error);
  revalidatePath(routes.networkContact(parsed.data));
  return { ok: true };
}

/** « Envoyer par e-mail »: PDS OS sends the link, then marks it sent. A
 * private contact's address only for whoever may read it. */
export async function emailNetworkFiche(
  contactId: string,
): Promise<WriteResult> {
  const parsed = id.safeParse(contactId);
  if (!parsed.success) return { ok: false, error: t.errors.failed };
  await requireApproved();
  const fiche = await loadNetworkFiche(parsed.data);
  if (!fiche?.url) return { ok: false, error: t.errors.forbidden };
  const supabase = await createClient();
  const contact = await contactAddressOf(supabase, parsed.data);
  if (!contact?.email) return { ok: false, error: t.emailed.noAddress };
  const sent = await emailLink({
    to: { name: contact.name, email: contact.email },
    subject: t.emailed.subject,
    message: `${core.linkEmail.greeting(contact.name)}\n\n${t.emailed.body}`,
    open: t.emailed.open,
    url: fiche.url,
  });
  if (sent === "sent") {
    const { error } = await supabase.rpc("mark_network_contact_fiche_sent", {
      p_contact_id: parsed.data,
    });
    if (error) console.error("emailNetworkFiche mark:", error.message);
  }
  revalidatePath(routes.networkContact(parsed.data));
  return emailOutcome(sent, {
    sent: t.emailed.sent(contact.name),
    failed: t.emailed.failed,
  });
}
