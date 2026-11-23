import "server-only";

import { pickCallGuests } from "@/lib/deals/call-guests-rules";
import { mainManager } from "@/lib/projects/recap-rules";
import { createClient } from "@/lib/supabase/server";

/**
 * The Réseau contacts a deal's call invites by default (pickCallGuests),
 * read with the user's session: the deal's contacts, the participation's
 * contact, the artist's main manager (Catalogue › Contacts, linked to the
 * Réseau), the counterpart, the artist's own contact.
 */
export async function loadCallGuests(input: {
  dealId: string | null;
  participationId: string | null;
  artistId: string | null;
  counterpartId: string | null;
}): Promise<string[]> {
  const supabase = await createClient();
  const none = Promise.resolve({ data: null });
  const [dealContacts, participation, managers, artistContact] =
    await Promise.all([
      input.dealId
        ? supabase
            .from("deal_contacts")
            .select("contact_id")
            .eq("deal_id", input.dealId)
        : none,
      input.participationId
        ? supabase
            .from("title_participations")
            .select("contact_id")
            .eq("id", input.participationId)
            .maybeSingle()
        : none,
      input.artistId
        ? supabase
            .from("artist_contacts")
            .select("role, name, phone, is_primary, created_at, contact_id")
            .eq("artist_id", input.artistId)
            .eq("role", "manager")
        : none,
      input.artistId
        ? supabase
            .from("network_contacts")
            .select("id")
            .eq("artist_id", input.artistId)
            .is("archived_at", null)
            .limit(1)
            .maybeSingle()
        : none,
    ]);
  const manager = mainManager(
    (managers.data ?? []).map((m) => ({
      role: m.role,
      name: m.name,
      phone: m.phone,
      isPrimary: m.is_primary,
      createdAt: m.created_at,
      contactId: m.contact_id,
    })),
  );
  return pickCallGuests({
    people: [
      ...(dealContacts.data ?? []).map((c) => c.contact_id),
      participation.data?.contact_id ?? null,
      manager?.contactId ?? null,
    ],
    counterpartId: input.counterpartId,
    artistContactId: artistContact.data?.id ?? null,
  });
}
