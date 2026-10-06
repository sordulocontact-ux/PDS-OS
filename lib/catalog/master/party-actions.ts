"use server";

import { requireApproved } from "@/lib/auth/dal";
import { catalogIdSchema } from "@/lib/catalog/schemas";
import { fr } from "@/lib/i18n/fr";
import type { NetworkRole } from "@/lib/network/types";
import { createClient } from "@/lib/supabase/server";

export type SplitParty = {
  // "contact:<id>" or "artist:<id>": what saveSplit stores.
  id: string;
  label: string;
  detail?: string;
  group: "credit" | "artist" | "network";
};

/**
 * Who a share of a title may go to (Sacha, 05/10/2026: pick, not retype):
 * the people credited on the title (their contact), the title's artists,
 * then the whole Réseau. Read with the user's session.
 */
export async function listSplitParties(
  masterId: string,
): Promise<SplitParty[]> {
  await requireApproved();
  const id = catalogIdSchema.safeParse(masterId);
  if (!id.success) return [];
  const supabase = await createClient();
  const [credits, artists, contacts] = await Promise.all([
    supabase
      .from("master_contributors")
      .select("name, role, contact_id")
      .eq("master_id", id.data)
      .not("contact_id", "is", null),
    supabase
      .from("master_artists")
      .select("artist:artists!master_artists_artist_same_org(id, name)")
      .eq("master_id", id.data)
      .order("position"),
    supabase
      .from("network_contacts")
      .select("id, name, roles")
      .is("archived_at", null)
      .order("name")
      .limit(1000),
  ]);
  const roles = fr.masterPage.credits.roles as Record<string, string>;
  const credited = new Map<string, SplitParty>();
  for (const c of credits.data ?? []) {
    if (!c.contact_id) continue;
    const known = credited.get(c.contact_id);
    const role = roles[c.role] ?? c.role;
    credited.set(c.contact_id, {
      id: `contact:${c.contact_id}`,
      label: known?.label ?? c.name,
      detail: known
        ? `${known.detail}, ${role}`
        : `${fr.masterPage.splits.party.credited} · ${role}`,
      group: "credit",
    });
  }
  return [
    ...credited.values(),
    ...(artists.data ?? []).flatMap((a) =>
      a.artist
        ? [
            {
              id: `artist:${a.artist.id}`,
              label: a.artist.name,
              detail: fr.masterPage.splits.party.artist,
              group: "artist" as const,
            },
          ]
        : [],
    ),
    ...(contacts.data ?? [])
      .filter((c) => !credited.has(c.id))
      .map((c) => ({
        id: `contact:${c.id}`,
        label: c.name,
        detail: (c.roles as NetworkRole[])
          .map((r) => fr.network.roles[r])
          .join(", "),
        group: "network" as const,
      })),
  ];
}
