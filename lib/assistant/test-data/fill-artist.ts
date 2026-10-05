import "server-only";

import {
  insertMasters,
  logged,
  type Supabase,
} from "@/lib/assistant/test-data/writes";
import type { ArtistDetail } from "@/lib/catalog/artist-types";

/**
 * Fills the empty parts of an artist's page with fake data
 * (docs/ASSISTANT.md § 3 ter): identity, biography, contacts, two titles.
 * What is already filled is left alone. Fictional values, not interface text.
 */

export type ArtistSection = "identity" | "bio" | "contacts" | "masters";
type Step = boolean | null;

const LEGAL_NAMES = [
  "Camille Laurent",
  "Yanis Benoît",
  "Sarah Mercier",
  "Théo Marchand",
];

const fakeBio = (name: string) =>
  `${name} mêle rap mélodique et production électronique. Après une série de freestyles remarqués, l'artiste prépare ses premiers projets avec PDS. (Biographie fictive, données de test.)`;

export async function fillArtist(
  supabase: Supabase,
  organizationId: string,
  artist: ArtistDetail,
): Promise<Partial<Record<ArtistSection, Step>>> {
  const steps: Partial<Record<ArtistSection, Step>> = {};

  steps.identity =
    artist.legalName && artist.countryCode
      ? null
      : logged(
          await supabase
            .from("artists")
            .update({
              legal_name:
                artist.legalName ??
                LEGAL_NAMES[Math.floor(Math.random() * LEGAL_NAMES.length)],
              country_code: artist.countryCode ?? "FR",
            })
            .eq("id", artist.id),
          "identity",
        );

  steps.bio = artist.bio
    ? null
    : logged(
        await supabase
          .from("artists")
          .update({ bio: fakeBio(artist.name) })
          .eq("id", artist.id),
        "bio",
      );

  // Contacts are read and written with manage_catalog only (RLS).
  const { count } = await supabase
    .from("artist_contacts")
    .select("id", { count: "exact", head: true })
    .eq("artist_id", artist.id);
  steps.contacts = count
    ? null
    : logged(
        await supabase.from("artist_contacts").insert([
          {
            name: "Nadia Ferrand",
            role: "manager",
            email: "nadia.ferrand@example.test",
            phone: "+33 6 00 00 00 01",
            is_primary: true,
            organization_id: organizationId,
            artist_id: artist.id,
          },
          {
            name: "Bureau presse Écho",
            role: "press",
            email: "presse@example.test",
            phone: null,
            is_primary: false,
            organization_id: organizationId,
            artist_id: artist.id,
          },
        ]),
        "contacts",
      );

  steps.masters = artist.masters.length
    ? null
    : !!(await insertMasters(
        supabase,
        organizationId,
        { id: artist.id, name: artist.name },
        2,
      ));

  return steps;
}
