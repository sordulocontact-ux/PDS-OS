import "server-only";

import { z } from "zod";

import { routes } from "@/lib/auth/redirects";
import { siteUrl } from "@/lib/auth/site-url";
import { createClient } from "@/lib/supabase/server";

// A contact's own fiche de renseignements, without a project (Sacha,
// 23/11/2026, migration 20261123210101): made by the database with the
// contact, its link read back by network_contact_fiche for who may manage it
// (Réseau + legal details + the contact's coordinates), null for the others.

const schema = z.object({
  id: z.string(),
  status: z.enum([
    "link_generated",
    "sent",
    "action_required",
    "complete",
    "revoked",
  ]),
  sentAt: z.string().nullable(),
  openedAt: z.string().nullable(),
  submittedAt: z.string().nullable(),
  revokedAt: z.string().nullable().optional(),
  token: z.string().nullable(),
});

/** Not sent, sent, opened by the person, filled (received or checked), or
 * its link revoked (« Révoquer le lien », no new one yet). */
export type NetworkFicheState =
  "link_generated" | "sent" | "opened" | "filled" | "revoked";

export type NetworkFiche = {
  state: NetworkFicheState;
  // When it reached that state.
  at: string | null;
  // The link to copy, while it can still be filled.
  url: string | null;
};

export async function loadNetworkFiche(
  contactId: string,
): Promise<NetworkFiche | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("network_contact_fiche", {
    p_contact_id: contactId,
  });
  if (error) {
    console.error("loadNetworkFiche:", error.message);
    return null;
  }
  const parsed = schema.safeParse(data);
  if (!parsed.success) return null;
  const f = parsed.data;
  const filled = f.status === "action_required" || f.status === "complete";
  const state: NetworkFicheState = filled
    ? "filled"
    : f.status === "revoked"
      ? "revoked"
      : f.status === "sent"
        ? f.openedAt
          ? "opened"
          : "sent"
        : "link_generated";
  return {
    state,
    at: filled
      ? f.submittedAt
      : f.status === "revoked"
        ? (f.revokedAt ?? null)
        : (f.openedAt ?? f.sentAt),
    url: f.token ? `${siteUrl()}${routes.legalForm(f.token)}` : null,
  };
}
