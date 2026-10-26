import "server-only";

import { cache } from "react";

import type { Access } from "@/lib/auth/access";
import { variantOf } from "@/lib/catalog/title-rules";
import { masterLabel } from "@/lib/catalog/types";
import { loadSheetSummaries } from "@/lib/design/sheet-summaries";
import type { SheetStatus } from "@/lib/design/states";
import { paramsOf, type DossierParams } from "@/lib/distribution/dossier";
import type {
  ReadinessCover,
  ReadinessInput,
  ReadinessLegal,
} from "@/lib/distribution/readiness";
import { loadFinalView } from "@/lib/master-workflow/final";
import { loadProjectDates } from "@/lib/projects/dates";
import type { ProjectDetail } from "@/lib/projects/types";
import { getProjectRelease, type ReleaseRow } from "@/lib/release/queries";
import {
  distributionCover,
  distributionLegalBlockers,
} from "@/lib/distribution/shared-reads";
import { createClient } from "@/lib/supabase/server";
import { loadWorkflowStates } from "@/lib/workflow-status/load";

// Credits the stores ask for: who wrote and composed the work.
const SONGWRITERS = new Set(["composer", "lyricist"]);

// The Fiche Livrable taken as the cover, by its title, until one is chosen
// (the same rule as distribution_cover, SQL; read by the Marketing).
export const COVER = /pochette|cover|artwork/i;

export type SheetOption = { id: string; title: string; status: SheetStatus };

export type DistributionSources = {
  input: ReadinessInput;
  // The dossier's own parameters (EMPTY_PARAMS before the first save).
  params: DossierParams;
  dossierId: string | null;
  // Who confirmed the parameters, and when (null: not confirmed yet).
  paramsConfirmed: { at: string; byId: string | null } | null;
  // Every Fiche Livrable of the project, to choose the cover from.
  sheets: SheetOption[];
  // Credits by name, per title (Catalogue).
  credits: Record<string, Array<{ name: string; role: string }>>;
  release: ReleaseRow | null;
  // The label: the organisation's name.
  label: string | null;
  // A source could not be read: said on the page, never shown as missing.
  failed: boolean;
};

/**
 * What the Distribution reuses, read from each owner module with the
 * viewer's session (RLS decides). The borrowings to secure come from
 * distribution_legal_blockers, readable without the Juridique; the cover
 * from distribution_cover (delivered by the Production); the release date
 * from the project (lib/projects/dates.ts). References, never copies. Once
 * per request.
 */
export const loadDistributionSources = cache(async function load(
  project: ProjectDetail,
  access: Access,
): Promise<DistributionSources> {
  const supabase = await createClient();
  const ids = project.masters.map((master) => master.id);
  const [
    masters,
    contributors,
    final,
    states,
    sheets,
    release,
    dossier,
    org,
    blockers,
    cover,
    dates,
  ] = await Promise.all([
    ids.length
      ? supabase
          .from("masters")
          .select(
            "id, title, variant, variant_label, isrc, rights_holder, rights_year, updated_at, credits:master_artists!master_artists_master_same_org(role)",
          )
          .in("id", ids)
      : null,
    ids.length
      ? supabase
          .from("master_contributors")
          .select("master_id, name, role")
          .in("master_id", ids)
      : null,
    loadFinalView(project, access),
    loadWorkflowStates(project.id),
    loadSheetSummaries(project.id).catch(() => null),
    getProjectRelease(supabase, project.id),
    supabase
      .from("distribution_dossiers")
      .select(
        "id, territory_mode, territories, preorder, preorder_on, prelisten, prelisten_on, price_tier, notes, cover_sheet_id, updated_at, params_confirmed_at, params_confirmed_by",
      )
      .eq("project_id", project.id)
      .maybeSingle(),
    access.organizationId
      ? supabase
          .from("organizations")
          .select("name")
          .eq("id", access.organizationId)
          .maybeSingle()
      : null,
    distributionLegalBlockers(project.id),
    distributionCover(project.id),
    loadProjectDates(project.id),
  ]);

  const rows = new Map((masters?.data ?? []).map((row) => [row.id, row]));
  const finals = new Map(final.titles.map((title) => [title.id, title]));
  const credits: DistributionSources["credits"] = {};
  const titles = project.masters.flatMap((master) => {
    const row = rows.get(master.id);
    if (!row) return [];
    const own = (contributors?.data ?? []).filter(
      (c) => c.master_id === master.id,
    );
    credits[master.id] = own.map((c) => ({ name: c.name, role: c.role }));
    const fin = finals.get(master.id);
    const file = fin?.final ?? fin?.before ?? null;
    return [
      {
        id: master.id,
        label: masterLabel({
          title: row.title,
          variant: variantOf(row.variant),
          variantLabel: row.variant_label,
        }),
        artists: master.artists,
        hasMainArtist: row.credits.some((credit) => credit.role === "main"),
        isrc: row.isrc,
        rightsHolder: row.rights_holder,
        rightsYear: row.rights_year,
        contributorCount: own.length,
        hasSongwriter: own.some((c) => SONGWRITERS.has(c.role)),
        updatedAt: row.updated_at,
        final: fin?.final
          ? {
              number: fin.final.number,
              decidedAt: fin.final.decidedAt,
              decidedBy: fin.final.decidedBy,
            }
          : null,
        before: fin?.before ? { addedAt: fin.before.addedAt } : null,
        finalFile: file
          ? {
              fileName: file.fileName,
              listenUrl: file.listenUrl,
              downloadUrl: file.downloadUrl,
            }
          : null,
      },
    ];
  });

  const legal: ReadinessLegal = {
    blockers: (blockers.data ?? []).map((b) => ({
      id: b.id,
      work: b.work,
      status: b.status,
    })),
  };

  const params = paramsOf(dossier.data);
  const options: SheetOption[] = (sheets ?? []).map((sheet) => ({
    id: sheet.id,
    title: sheet.title,
    status: sheet.status,
  }));
  const found = cover.data?.[0] ?? null;
  const coverInput: ReadinessCover | null = found
    ? {
        id: found.sheet_id,
        title: found.title,
        chosen: found.chosen,
        status: options.find((s) => s.id === found.sheet_id)?.status ?? null,
        deliverableId: found.deliverable_id,
        delivered: found.delivered_at
          ? { at: found.delivered_at, version: found.version_number }
          : null,
      }
    : null;

  const releaseRow = release?.release ?? null;
  return {
    input: {
      projectId: project.id,
      titles,
      legal,
      constraints: states?.details.rightsConstraints ?? [],
      cover: coverInput,
      release: releaseRow
        ? {
            title: releaseRow.title,
            upc: releaseRow.upc,
            isrc: releaseRow.isrc,
            updatedAt: releaseRow.updated_at,
          }
        : null,
      releaseDate: dates.release,
    },
    params,
    dossierId: dossier.data?.id ?? null,
    paramsConfirmed: dossier.data?.params_confirmed_at
      ? {
          at: dossier.data.params_confirmed_at,
          byId: dossier.data.params_confirmed_by,
        }
      : null,
    sheets: options,
    credits,
    release: releaseRow,
    label: org?.data?.name ?? null,
    failed:
      !!masters?.error ||
      !!contributors?.error ||
      !!dossier.error ||
      !!blockers.error ||
      !!cover.error ||
      final.failed ||
      sheets === null,
  };
});
