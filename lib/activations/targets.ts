import "server-only";

import { cache } from "react";

import { probableDuplicate } from "@/lib/activations/duplicates";
import type { Priority, TargetOutcome } from "@/lib/activations/model";
import { createClient } from "@/lib/supabase/server";

export type TargetRecord = {
  id: string;
  contactId: string;
  contactName: string;
  contactEmail: string | null;
  tiktok: string | null;
  instagram: string | null;
  journalistId: string | null;
  journalistName: string | null;
  journalistEmail: string | null;
  priority: Priority;
  angle: string | null;
  justification: string | null;
  ownerPersonId: string | null;
  outcome: TargetOutcome | null;
  outcomeReason: string | null;
  outcomeAt: string | null;
  confirmedWarnings: string[];
  createdAt: string;
};

/** An activation's targets with the Réseau's identity of each (name, ways to
 * reach them, accounts), read where it lives. Cached per request. */
export const loadTargets = cache(
  async (activationId: string): Promise<TargetRecord[]> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("activation_targets")
      .select(
        "id, contact_id, journalist_contact_id, priority, angle, justification, owner_person_id, outcome, outcome_reason, outcome_at, confirmed_warnings, created_at",
      )
      .eq("activation_id", activationId)
      .order("created_at");
    if (error) console.error("loadTargets:", error.message);
    const rows = data ?? [];
    const ids = [
      ...new Set(
        rows.flatMap((r) => [
          r.contact_id,
          ...(r.journalist_contact_id ? [r.journalist_contact_id] : []),
        ]),
      ),
    ];
    const { data: contacts } = ids.length
      ? await supabase
          .from("network_contacts")
          .select("id, name, email, tiktok_handle, instagram_handle")
          .in("id", ids)
      : { data: [] };
    const contactOf = (id: string | null) => contacts?.find((c) => c.id === id);
    return rows.map((r) => {
      const c = contactOf(r.contact_id);
      const j = contactOf(r.journalist_contact_id);
      return {
        id: r.id,
        contactId: r.contact_id,
        contactName: c?.name ?? "—",
        contactEmail: c?.email ?? null,
        tiktok: c?.tiktok_handle ?? null,
        instagram: c?.instagram_handle ?? null,
        journalistId: r.journalist_contact_id,
        journalistName: j?.name ?? null,
        journalistEmail: j?.email ?? null,
        priority: r.priority as Priority,
        angle: r.angle,
        justification: r.justification,
        ownerPersonId: r.owner_person_id,
        outcome: r.outcome as TargetOutcome | null,
        outcomeReason: r.outcome_reason,
        outcomeAt: r.outcome_at,
        confirmedWarnings: r.confirmed_warnings,
        createdAt: r.created_at,
      };
    });
  },
);

export type TargetWarning =
  | { key: "proposed"; count: number }
  | { key: "contacted" | "collaborated" | "refused" | "stale" | "noData" }
  // RP: the same media already targeted under another card, or the same
  // journalist under another media (« Doublon probable »).
  | { key: "duplicate"; of: string }
  | { key: "sameJournalist"; journalist: string; of: string };

const SIX_MONTHS = 183 * 24 * 60 * 60 * 1000;

/**
 * What to know before adding a profile (ticket Influence § 4 : « déjà
 * proposé, déjà contacté, déjà collaboré, refus antérieur, indisponibilité
 * connue et donnée trop ancienne ») from its other campaigns — targets and
 * agency rows linked to it — and its dated observations. An alert never
 * forbids : it is confirmed.
 */
export async function warningsFor(
  contactId: string,
  activationId: string,
  withAudience: boolean,
  press: { journalistId: string | null } | null = null,
): Promise<TargetWarning[]> {
  const supabase = await createClient();
  const [targets, rows, observations] = await Promise.all([
    supabase
      .from("activation_targets")
      .select("id, activation_id, outcome")
      .eq("contact_id", contactId)
      .neq("activation_id", activationId),
    supabase
      .from("agency_rows")
      .select("id, activation_id")
      .eq("contact_id", contactId)
      .neq("activation_id", activationId),
    supabase
      .from("network_observations")
      .select("observed_on")
      .eq("contact_id", contactId)
      .eq("kind", "followers")
      .is("invalidated_at", null)
      .order("observed_on", { ascending: false })
      .limit(1),
  ]);
  const others = targets.data ?? [];
  const warnings: TargetWarning[] = [];
  const proposed = others.length + (rows.data?.length ?? 0);
  if (proposed > 0) warnings.push({ key: "proposed", count: proposed });
  if (others.length > 0) {
    const { count } = await supabase
      .from("activation_messages")
      .select("id", { count: "exact", head: true })
      .in(
        "target_id",
        others.map((o) => o.id),
      )
      .eq("status", "sent_declared");
    if ((count ?? 0) > 0) warnings.push({ key: "contacted" });
  }
  if (others.some((o) => o.outcome === "closed"))
    warnings.push({ key: "collaborated" });
  if (others.some((o) => o.outcome === "refused" || o.outcome === "declined"))
    warnings.push({ key: "refused" });
  if (withAudience) {
    const last = observations.data?.[0]?.observed_on;
    if (!last) warnings.push({ key: "noData" });
    else if (Date.now() - new Date(last).getTime() > SIX_MONTHS)
      warnings.push({ key: "stale" });
  }
  if (press)
    warnings.push(
      ...(await duplicatesFor(contactId, activationId, press.journalistId)),
    );
  return warnings;
}

/** « Doublon probable » in this campaign: the media under another card of
 * the Réseau, or the journalist already targeted under another media. */
async function duplicatesFor(
  contactId: string,
  activationId: string,
  journalistId: string | null,
): Promise<TargetWarning[]> {
  const supabase = await createClient();
  const { data: targets } = await supabase
    .from("activation_targets")
    .select("contact_id, journalist_contact_id")
    .eq("activation_id", activationId)
    .neq("contact_id", contactId);
  const others = targets ?? [];
  if (others.length === 0) return [];
  const ids = [
    contactId,
    ...others.map((o) => o.contact_id),
    ...(journalistId ? [journalistId] : []),
  ];
  const { data: contacts } = await supabase
    .from("network_contacts")
    .select("id, name, email")
    .in("id", ids);
  const card = (id: string | null) => contacts?.find((c) => c.id === id);
  const media = card(contactId);
  const out: TargetWarning[] = [];
  if (media) {
    const twin = probableDuplicate(
      media,
      others.flatMap((o) => {
        const c = card(o.contact_id);
        return c ? [c] : [];
      }),
    );
    if (twin) out.push({ key: "duplicate", of: twin.name });
  }
  const journalist = card(journalistId);
  const already = journalistId
    ? others.find((o) => o.journalist_contact_id === journalistId)
    : null;
  if (journalist && already)
    out.push({
      key: "sameJournalist",
      journalist: journalist.name,
      of: card(already.contact_id)?.name ?? "—",
    });
  return out;
}
