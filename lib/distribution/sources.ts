import "server-only";

import { trackedCache } from "@/lib/projects/live-deps";

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
import { listMasterCovers } from "@/lib/catalog/covers";
import { routes } from "@/lib/auth/redirects";
import { legalParticipationsHref } from "@/lib/ui/legal-steps";
import { loadContractGaps, gapNames } from "@/lib/legal/contract-gaps";
import {
  joinArtistNames,
  withFeaturing,
} from "@/lib/projects/participation-rules";
import type { DistributionProject } from "@/lib/distribution/release-scope";
import {
  inScope,
  releaseIdOf,
  type ScopedProject,
} from "@/lib/distribution/scope";
import type {
  ReadinessCollective,
  TrackDelivery,
} from "@/lib/distribution/readiness";
import { fr as frAll } from "@/lib/i18n/fr";
import {
  masterNameOf,
  projectTitleLabel,
  titleGuestNames,
} from "@/lib/projects/title-rules";
import {
  getProjectRelease,
  PROJECT_RELEASE,
  type ReleaseRow,
} from "@/lib/release/queries";
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
export const loadDistributionSources = trackedCache(async function load(
  project: ProjectDetail & ScopedProject,
  access: Access,
): Promise<DistributionSources> {
  const supabase = await createClient();
  const ids = project.masters.map((master) => master.id);
  // A collective's release (lot 15): its tracks, its cover, its date.
  const releaseId = releaseIdOf(project);
  const scoped = project.distributionRelease ?? null;
  const releaseTitles =
    (project as Partial<DistributionProject>).distributionTitles ?? [];
  const titleCoverMaster =
    scoped?.kind === "title" ? (releaseTitles[0]?.master?.id ?? null) : null;
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
    getProjectRelease(
      supabase,
      project.id,
      scoped?.kind === "title" && scoped.titleId
        ? { kind: "title", titleId: scoped.titleId }
        : PROJECT_RELEASE,
    ),
    inScope(
      supabase
        .from("distribution_dossiers")
        .select(
          "id, territory_mode, territories, preorder, preorder_on, prelisten, prelisten_on, price_tier, notes, cover_sheet_id, updated_at, params_confirmed_at, params_confirmed_by",
        )
        .eq("project_id", project.id),
      releaseId,
    ).maybeSingle(),
    access.organizationId
      ? supabase
          .from("organizations")
          .select("name")
          .eq("id", access.organizationId)
          .maybeSingle()
      : null,
    distributionLegalBlockers(project.id),
    distributionCover(project.id, releaseId),
    loadProjectDates(project.id),
  ]);
  const [titleCovers, gaps] = await Promise.all([
    titleCoverMaster
      ? listMasterCovers(titleCoverMaster)
      : Promise.resolve(null),
    scoped ? loadContractGaps(project.id, "release") : Promise.resolve([]),
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
        ...(scoped
          ? {
              delivery: trackDelivery(
                project.artistName,
                masterLabel({
                  title: row.title,
                  variant: variantOf(row.variant),
                  variantLabel: row.variant_label,
                }),
                releaseTitles.find((t) => t.master?.id === master.id) ?? null,
              ),
            }
          : {}),
      },
    ];
  });
  const ownTitles = new Set(releaseTitles.map((t) => t.id));
  const releaseGaps = gaps.filter((g) => ownTitles.has(g.titleId));
  const titleLabelOf = (t: (typeof releaseTitles)[number]) =>
    projectTitleLabel({
      position: t.position,
      workingTitle: t.workingTitle,
      masterTitle: masterNameOf(t.master),
      artists: titleGuestNames(t.participations),
    });
  const collective: ReadinessCollective | null = scoped
    ? {
        kind: scoped.kind,
        titlesHref: routes.projectTitles(project.id),
        contractsHref: legalParticipationsHref(project.id),
        contracts: releaseGaps.length ? gapNames(releaseGaps) : null,
        provisional: releaseTitles
          .filter((t) => t.master?.provisional)
          .map(titleLabelOf),
        withoutMaster:
          scoped.kind === "compilation"
            ? releaseTitles.filter((t) => !t.master).map(titleLabelOf)
            : [],
        catalogCover: titleCoverMaster
          ? {
              masterId: titleCoverMaster,
              fileName: titleCovers?.get(titleCoverMaster)?.fileName ?? null,
            }
          : null,
      }
    : null;

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
      // A collective's release (lot 15): its own date.
      releaseDate: scoped
        ? scoped.date
          ? {
              date: scoped.date,
              source:
                scoped.kind === "title"
                  ? frAll.distributionJourney.facts.titleReleaseSource
                  : frAll.distributionJourney.facts.compilationSource,
            }
          : null
        : dates.release,
      collective,
      releaseId,
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

const FEAT = /\s*[([]?\s*\b(feat\.?|ft\.?|featuring)\s+[^)\]]*[)\]]?\s*$/i;

/**
 * A collective's track as the platforms receive it (lot 15, décision 10):
 * the project's artist as main artist (with any other main credit of the
 * title), its confirmed guests in featuring, written in the title as the
 * platforms do (« Marina (feat. Lou Vega) »). What the Catalogue does not
 * credit is said, never invented.
 */
export function trackDelivery(
  projectArtist: string,
  catalogueTitle: string,
  title: DistributionProject["distributionTitles"][number] | null,
): TrackDelivery {
  const credits = title?.master?.credits ?? [];
  const mains = credits
    .filter((c) => c.role === "main")
    .map((c) => c.artist.name);
  const credited = new Set(
    credits.filter((c) => c.role === "featuring").map((c) => c.artist.name),
  );
  const featuring = (title?.participations ?? [])
    .filter((p) => p.status === "confirmed" && p.role === "featuring")
    .map((p) => p.artist.name);
  const cleanTitle = catalogueTitle.replace(FEAT, "").trim() || catalogueTitle;
  const main = mains.includes(projectArtist)
    ? [projectArtist, ...mains.filter((m) => m !== projectArtist)]
    : [projectArtist];
  return {
    title: withFeaturing(cleanTitle, featuring),
    main: joinArtistNames(main),
    featuring,
    missingMain: !mains.includes(projectArtist),
    missingFeaturing: featuring.filter((name) => !credited.has(name)),
    cleaned: cleanTitle !== catalogueTitle,
  };
}
