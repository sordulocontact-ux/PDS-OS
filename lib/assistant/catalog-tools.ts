import "server-only";

import { tool } from "ai";
import { z } from "zod";

import { findNamed, foldName, rankByName } from "@/lib/assistant/propose/match";
import type { Source } from "@/lib/assistant/sources";
import { routes } from "@/lib/auth/redirects";
import { listMasters } from "@/lib/catalog/queries";
import {
  ARTIST_RELATIONS,
  artistRelationOf,
  formatDuration,
  formatFans,
  formatIsrc,
  masterLabel,
  type MasterListItem,
} from "@/lib/catalog/types";
import { fr } from "@/lib/i18n/fr";
import { getDeezerArtist } from "@/lib/integrations/deezer";
import { createClient } from "@/lib/supabase/server";

// Read-only catalog functions (docs/ASSISTANT.md § 3), with the user's
// session. Rankings and counts are computed here, never by the model.

// Deezer is read live: beyond this, the rest of the catalog is listed unranked.
const MAX_DEEZER_LOOKUPS = 30;

export function findArtistsTool() {
  return tool({
    description:
      "Liste les artistes du catalogue, classés par nombre de fans Deezer (calculé par l'application), avec leur relation avec PDS (Signé = roster PDS, Collaboration = projets ponctuels) et leur nombre de masters. Sert aussi à « l'artiste le plus écouté / 2e en écoutes » : les écoutes ne sont pas disponibles, le classement se fait aux fans Deezer.",
    inputSchema: z.object({
      query: z
        .string()
        .max(100)
        .optional()
        .describe("Nom d'artiste, même approximatif ; absent pour tout lister"),
      relation: z
        .enum(ARTIST_RELATIONS)
        .optional()
        .describe(
          "signed = artistes signés (roster PDS), collaboration = collaborations ; absent pour les deux",
        ),
    }),
    execute: async ({ query, relation }) => {
      const t = fr.assistant.catalog;
      const relations = fr.catalog.relation.labels;
      const supabase = await createClient();
      const selected = supabase
        .from("artists")
        .select(
          "id, name, relation, deezer_id, credits:master_artists!master_artists_artist_same_org(count)",
        )
        .is("archived_at", null);
      const { data } = await (
        relation ? selected.eq("relation", relation) : selected
      ).order("name");
      let rows = data ?? [];
      if (query?.trim()) {
        // Spelled or dictated wrong: what sounds like it ("untrill" → "Huntrill").
        rows = rankByName(rows, query, (a) => a.name).map((r) => r.item);
      }

      const withFans = await Promise.all(
        rows.map(async (a, i) => {
          const deezer =
            a.deezer_id && i < MAX_DEEZER_LOOKUPS
              ? await getDeezerArtist(a.deezer_id).catch(() => null)
              : null;
          return {
            ...a,
            fans: deezer?.fans ?? null,
            masterCount: a.credits[0]?.count ?? 0,
          };
        }),
      );
      // Most fans first; artists without a Deezer profile last, by name.
      withFans.sort((a, b) => (b.fans ?? -1) - (a.fans ?? -1));

      let rank = 0;
      const facts = withFans.map((a) => {
        const masters = t.masterCount(a.masterCount);
        const label = relations[artistRelationOf(a.relation)];
        if (a.fans === null) return t.artistNoDeezer(a.name, label, masters);
        rank += 1;
        return t.artistRanked(rank, a.name, label, formatFans(a.fans), masters);
      });
      return {
        facts: facts.length ? [t.fansNotStreams, ...facts] : [t.noArtist],
        sources: withFans
          .slice(0, 8)
          .map((a): Source => ({ label: a.name, href: routes.artist(a.id) })),
      };
    },
  });
}

function masterFact(m: MasterListItem): string {
  return fr.assistant.catalog.master(
    masterLabel(m),
    m.artists,
    m.isrc ? formatIsrc(m.isrc) : null,
    m.durationSeconds !== null ? formatDuration(m.durationSeconds) : null,
  );
}

export function findMastersTool() {
  return tool({
    description:
      "Liste les masters (enregistrements) du catalogue avec leurs artistes, ISRC et durée ; filtrable par artiste ou par titre.",
    inputSchema: z.object({
      artist: z.string().max(200).optional().describe("Nom de l'artiste"),
      query: z.string().max(200).optional().describe("Titre, même partiel"),
    }),
    execute: async ({ artist, query }) => {
      const t = fr.assistant.catalog;
      const notes: string[] = [];
      let masters: MasterListItem[] = (await listMasters()).masters;
      if (artist) {
        const supabase = await createClient();
        const { data } = await supabase
          .from("artists")
          .select("id, name")
          .is("archived_at", null);
        const found = findNamed(data ?? [], artist, (a) => a.name, notes);
        if (!found)
          return {
            facts: [fr.assistant.drafts.notFound(t.artist, artist)],
            sources: [],
          };
        // Credits are formatted "Nova feat. Sable": the name is in the line.
        const name = foldName(found.name);
        masters = masters.filter((m) => foldName(m.artists).includes(name));
      }
      if (query?.trim()) {
        masters = rankByName(masters, query, (m) => masterLabel(m)).map(
          (r) => r.item,
        );
      }
      const shown = masters.slice(0, 30);
      return {
        facts: [
          ...notes,
          ...(shown.length ? shown.map(masterFact) : [t.noMaster]),
        ],
        sources: shown.slice(0, 8).map((m): Source => ({
          label: masterLabel(m),
          href: routes.master(m.id),
        })),
      };
    },
  });
}
