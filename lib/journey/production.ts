import "server-only";

import { trackedCache } from "@/lib/projects/live-deps";

import { fr } from "@/lib/i18n/fr";
import { loadConceptionLinks } from "@/lib/production/conception-links";
import { journeyContext } from "@/lib/production/journey/context";
import { isArtworkTitle } from "@/lib/production/track";
import { createClient } from "@/lib/supabase/server";

import type { ModuleJourney } from "./types";

// The Production's part of the Marketing loader (lib/journey/sources.ts):
// one journey per deliverable in Production. A deliverable is in Production
// from the transfer of its Fiche (proto: « La Production commence au
// transfert »), with « Qui produit ? » to answer first; before any transfer
// was made (projects started before the Conception's hand-off), from its
// validated version, as before.

export type ProductionDeliverableRef = {
  id: string;
  title: string;
  // Who produces it, once chosen.
  kind: "internal" | "external" | null;
  company: string | null;
  closed: boolean;
  sheetId: string | null;
  // Teasers « Décliné du Clip officiel » (PR-13).
  derived: boolean;
};

/** The deliverables in Production, in the Stratégie's order, read with the
 * user's session. Cached per request: the bar and the loader share it. */
export const productionDeliverables = trackedCache(
  async (projectId: string): Promise<ProductionDeliverableRef[]> => {
    const supabase = await createClient();
    const [deliverables, sheets, versions, links, deliveries] =
      await Promise.all([
        supabase
          .from("strategy_deliverables")
          .select("id, title")
          .eq("project_id", projectId)
          .order("created_at"),
        supabase
          .from("production_sheets")
          .select(
            "id, deliverable_id, organization, closed_at, derived_from_sheet_id, company:network_contacts!production_sheets_company_contact_id_fkey(name)",
          )
          .eq("project_id", projectId),
        supabase
          .from("design_versions")
          .select("deliverable_id")
          .eq("project_id", projectId)
          .eq("status", "approved"),
        loadConceptionLinks(supabase, projectId),
        supabase
          .from("deliverable_deliveries")
          .select("deliverable_id, delivered_at")
          .eq("project_id", projectId)
          .not("delivered_at", "is", null),
      ]);
    const delivered = new Set(
      (deliveries.data ?? []).map((x) => x.deliverable_id),
    );
    const failed = deliverables.error ?? sheets.error;
    if (failed) console.error("productionDeliverables:", failed.message);
    const sheetOf = new Map(
      (sheets.data ?? []).map((s) => [s.deliverable_id, s]),
    );
    const approved = new Set(
      (versions.data ?? []).map((v) => v.deliverable_id),
    );
    return (deliverables.data ?? []).flatMap((d) => {
      const sheet = sheetOf.get(d.id);
      const handed =
        links.size > 0
          ? links.get(d.id)?.state === "handed"
          : approved.has(d.id);
      if (!sheet && !handed) return [];
      const kind =
        sheet?.organization === "internal" || sheet?.organization === "external"
          ? sheet.organization
          : null;
      return [
        {
          id: d.id,
          title: d.title,
          kind,
          company: kind === "external" ? (sheet?.company?.name ?? null) : null,
          // « livré »: closed, or delivered for a light journey (proto
          // livDelivered: a cover, teasers drawn from the clip).
          closed:
            Boolean(sheet?.closed_at) ||
            (delivered.has(d.id) &&
              (Boolean(sheet?.derived_from_sheet_id) ||
                isArtworkTitle(d.title))),
          sheetId: sheet?.id ?? null,
          derived: Boolean(sheet?.derived_from_sheet_id),
        },
      ];
    });
  },
);

/** Each deliverable's Production journey, for « Maintenant » and the lists. */
export async function productionJourneys(
  projectId: string,
): Promise<ModuleJourney[]> {
  const list = await productionDeliverables(projectId);
  const journeys = await Promise.all(
    list.map(async ({ id, title }) => {
      const ctx = await journeyContext(projectId, id);
      return {
        module: "marketing" as const,
        label: fr.shell.project.sidebar.marketing,
        part: {
          key: `production:${id}`,
          label: `${fr.shell.project.marketingSteps.production} › ${title}`,
        },
        steps: ctx.steps,
      };
    }),
  );
  return journeys;
}
