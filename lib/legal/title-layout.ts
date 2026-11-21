import "server-only";

import type { Demarche } from "@/lib/legal/demarches/build";
import { legalJourneyContext } from "@/lib/legal/journey-context";
import { legalClearanceRows } from "@/lib/legal/shared-rows";
import {
  layoutByTitle,
  legalTitlesOf,
  type DemarcheAnchor,
  type TitleLayout,
} from "@/lib/legal/title-groups";
import { trackedCache } from "@/lib/projects/live-deps";
import { loadProjectTitles } from "@/lib/projects/titles";
import { createClient } from "@/lib/supabase/server";

/**
 * The Juridique's journey of a collective, one group per title
 * (lib/legal/title-groups.ts), for the spine and the head of its steps;
 * null for any other project (its journey stays as legalJourney built it).
 * Read with the viewer's session, once per render: the project's titles
 * and their guests, its borrowings' masters, and the artist page each guest
 * is linked to in the Réseau (network_contacts.artist_id, ids only: no
 * contact is shown from here).
 */
export const legalTitleLayout = trackedCache(
  async (projectId: string): Promise<TitleLayout | null> => {
    const ctx = await legalJourneyContext(projectId);
    if (!ctx.project.collective) return null;
    const [titles, clearances] = await Promise.all([
      loadProjectTitles(projectId),
      legalClearanceRows(projectId),
    ]);
    if (clearances.error)
      console.error("legalTitleLayout clearances:", clearances.error.message);
    const legalTitles = legalTitlesOf(
      titles,
      ctx.project.masters.map((m) => m.id),
    );
    const guests = [
      ...new Set(legalTitles.flatMap((title) => title.guestArtistIds)),
    ];
    const artistsOf = new Map<string, string[]>();
    if (guests.length > 0) {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("network_contacts")
        .select("id, artist_id")
        .in("artist_id", guests);
      if (error) console.error("legalTitleLayout contacts:", error.message);
      for (const row of data ?? [])
        if (row.artist_id)
          artistsOf.set(row.id, [
            ...(artistsOf.get(row.id) ?? []),
            row.artist_id,
          ]);
    }
    const masterOfClearance = new Map(
      (clearances.data ?? []).map((c) => [c.id, c.master_id]),
    );
    const anchors = ctx.demarches.map((d): DemarcheAnchor => ({
      key: d.step.key,
      kind: d.kind,
      masterId:
        d.kind === "split" || d.kind === "sacem"
          ? d.ref
          : d.kind === "clearance"
            ? (masterOfClearance.get(d.ref) ?? null)
            : null,
      artistIds:
        d.kind === "person" ? personArtists(d, ctx.forms, artistsOf) : [],
    }));
    return layoutByTitle({
      projectId,
      steps: ctx.steps,
      anchors,
      titles: legalTitles,
    });
  },
);

/** The artist pages a person of the Juridique is known as: their key
 * (`artist:<id>`, a guest not in the Réseau yet), their fiche's artist, the
 * artist their contact is linked to. */
function personArtists(
  d: Demarche,
  forms: Array<{
    key: string;
    contactId: string | null;
    artistId: string | null;
  }>,
  artistsOf: Map<string, string[]>,
): string[] {
  const form = forms.find((f) => f.key === d.ref);
  const contactId =
    form?.contactId ??
    (d.ref.startsWith("contact:") ? d.ref.slice("contact:".length) : null);
  return [
    ...(d.ref.startsWith("artist:") ? [d.ref.slice("artist:".length)] : []),
    ...(form?.artistId ? [form.artistId] : []),
    ...(contactId ? (artistsOf.get(contactId) ?? []) : []),
  ];
}
