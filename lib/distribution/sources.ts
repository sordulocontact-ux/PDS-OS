import "server-only";

import type { Access } from "@/lib/auth/access";
import { variantOf } from "@/lib/catalog/title-rules";
import { masterLabel } from "@/lib/catalog/types";
import { loadSheetSummaries } from "@/lib/design/sheet-summaries";
import type { SheetStatus } from "@/lib/design/states";
import { paramsOf, type DossierParams } from "@/lib/distribution/dossier";
import type {
  ReadinessInput,
  ReadinessLegal,
} from "@/lib/distribution/readiness";
import { legalActionHref } from "@/lib/legal/plan/where";
import { loadFinalView } from "@/lib/master-workflow/final";
import type { ProjectDetail } from "@/lib/projects/types";
import { getProjectRelease, type ReleaseRow } from "@/lib/release/queries";
import { createClient } from "@/lib/supabase/server";
import { loadWorkflowStates } from "@/lib/workflow-status/load";

// Credits the stores ask for: who wrote and composed the work.
const SONGWRITERS = new Set(["composer", "lyricist"]);

// The Fiche Livrable taken as the cover, by its title, until one is chosen.
export const COVER = /pochette|cover|artwork/i;

export type SheetOption = { id: string; title: string; status: SheetStatus };

export type DistributionSources = {
  input: ReadinessInput;
  // The dossier's own parameters (EMPTY_PARAMS before the first save).
  params: DossierParams;
  dossierId: string | null;
  // Every Fiche Livrable of the project, to choose the cover from.
  sheets: SheetOption[];
  // The cover was found by its title, not chosen in the dossier.
  coverGuessed: boolean;
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
 * viewer's session (RLS decides; the Juridique only with manage_legal,
 * through the workflows' shared reading). References, never copies.
 */
export async function loadDistributionSources(
  project: ProjectDetail,
  access: Access,
): Promise<DistributionSources> {
  const supabase = await createClient();
  const ids = project.masters.map((master) => master.id);
  const [masters, contributors, final, states, sheets, release, dossier, org] =
    await Promise.all([
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
          "id, territory_mode, territories, preorder, preorder_on, prelisten, prelisten_on, price_tier, notes, cover_sheet_id, updated_at",
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
        finalFile: (() => {
          const file = fin?.final ?? fin?.before ?? null;
          return file
            ? {
                fileName: file.fileName,
                listenUrl: file.listenUrl,
                downloadUrl: file.downloadUrl,
              }
            : null;
        })(),
      },
    ];
  });

  const legalState = states?.states.legal;
  const legal: ReadinessLegal =
    !legalState || legalState === "restricted"
      ? { allowed: false }
      : {
          allowed: true,
          reason: legalState.reason,
          items: (states?.details.legalItems ?? [])
            .filter(
              (item) => item.current !== "done" && item.current !== "obsolete",
            )
            .map((item) => ({
              id: item.id,
              label: item.subject
                ? `${item.label} · ${item.subject}`
                : item.label,
              reason: item.reason,
              blocking: item.kind === "clearance",
              href: item.sourceHref ?? legalActionHref(project.id, item.kind),
            })),
        };

  const params = paramsOf(dossier.data);
  const options: SheetOption[] = (sheets ?? []).map((sheet) => ({
    id: sheet.id,
    title: sheet.title,
    status: sheet.status,
  }));
  const validated = (sheet: SheetOption) =>
    sheet.status === "ready_for_production" || sheet.status === "transferred";
  // Chosen in the dossier; otherwise guessed by its title, validated first.
  const chosen = params.coverSheetId
    ? (options.find((sheet) => sheet.id === params.coverSheetId) ?? null)
    : null;
  const guesses = options.filter((sheet) => COVER.test(sheet.title));
  const cover = chosen ?? guesses.find(validated) ?? guesses[0] ?? null;

  const releaseRow = release?.release ?? null;
  return {
    input: {
      projectId: project.id,
      titles,
      legal,
      constraints: states?.details.rightsConstraints ?? [],
      cover,
      release: releaseRow
        ? {
            title: releaseRow.title,
            plannedDate: releaseRow.planned_release_date,
            upc: releaseRow.upc,
            isrc: releaseRow.isrc,
            updatedAt: releaseRow.updated_at,
          }
        : null,
    },
    params,
    dossierId: dossier.data?.id ?? null,
    sheets: options,
    coverGuessed: cover !== null && chosen === null,
    credits,
    release: releaseRow,
    label: org?.data?.name ?? null,
    failed:
      !!masters?.error ||
      !!contributors?.error ||
      !!dossier.error ||
      final.failed ||
      sheets === null,
  };
}
