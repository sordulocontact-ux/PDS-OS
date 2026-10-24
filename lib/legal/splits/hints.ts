import "server-only";

import { fr } from "@/lib/i18n/fr";
import type { PublishingHint } from "@/lib/legal/splits/draft";
import { createClient } from "@/lib/supabase/server";

/**
 * What PDS OS knows of who publishes each creator's share (JUR-01), for the
 * split editor to start from, with its source: the publisher named in their
 * fiche (picked in the Réseau by the team, never matched by name), the
 * publishing contract planned with PDS, or « Pas d'accord nécessaire ».
 * Nothing known: nothing proposed. Read with the viewer's session.
 */
export async function loadPublishingHints(
  projectId: string,
  contactIds: string[],
): Promise<Record<string, PublishingHint>> {
  if (contactIds.length === 0) return {};
  const t = fr.legalSplits.editor.hint;
  const supabase = await createClient();
  const [details, needs, none] = await Promise.all([
    supabase
      .from("contact_legal_details")
      .select("contact_id, details")
      .in("contact_id", contactIds),
    supabase
      .from("legal_agreement_needs")
      .select("contact_id, contract_type, contract_id")
      .eq("project_id", projectId)
      .in("contact_id", contactIds),
    supabase
      .from("legal_no_agreement_reasons")
      .select("contact_id, reason")
      .eq("project_id", projectId)
      .in("contact_id", contactIds),
  ]);
  for (const [scope, result] of Object.entries({ details, needs, none }))
    if (result.error)
      console.error(`loadPublishingHints ${scope}:`, result.error.message);

  const out: Record<string, PublishingHint> = {};
  for (const id of contactIds) {
    const raw = (details.data ?? []).find((d) => d.contact_id === id)?.details;
    const named =
      raw && typeof raw === "object" && !Array.isArray(raw)
        ? String((raw as Record<string, unknown>).publisher ?? "").trim()
        : "";
    const planned = (needs.data ?? []).some(
      (n) => n.contact_id === id && n.contract_type === "publishing",
    );
    const reason = (none.data ?? []).find((n) => n.contact_id === id)?.reason;
    if (named)
      out[id] = {
        mode: "other",
        coedition: planned,
        source: planned ? t.ficheCoedition(named) : t.fiche(named),
      };
    else if (planned)
      out[id] = { mode: "house", coedition: false, source: t.planned };
    else if (reason)
      out[id] = { mode: "none", coedition: false, source: t.none(reason) };
  }
  return out;
}
