import "server-only";

import { trackedCache } from "@/lib/projects/live-deps";

import { requireApproved } from "@/lib/auth/dal";
import { isOpen } from "@/lib/distribution/anomalies";
import { loadAnomalies } from "@/lib/distribution/anomalies-queries";
import { loadClosureView } from "@/lib/distribution/closure-queries";
import { distributionJourney } from "@/lib/distribution/journey";
import { changedByOf, type ParamsData } from "@/lib/distribution/params-view";
import { loadPlatformsView } from "@/lib/distribution/platforms-queries";
import { preorderProposal } from "@/lib/distribution/proposals";
import { territoriesText } from "@/lib/distribution/delivery-file";
import { cycleState } from "@/lib/distribution/tracking";
import { loadTrackingView } from "@/lib/distribution/tracking-queries";
import { loadDistributionView } from "@/lib/distribution/view";
import { loadMembers } from "@/lib/framing/related";
import { fr } from "@/lib/i18n/fr";
import { loadLegalReadiness } from "@/lib/legal/readiness/load";
import { loadProjectDates } from "@/lib/projects/dates";
import { projectPlanRow } from "@/lib/plan/queries";
import { getProject } from "@/lib/projects/queries";
import { countedTitlesProject } from "@/lib/projects/counted-titles";
import { personName } from "@/lib/projects/types";
import { byProjectVersion } from "@/lib/projects/version-cache";
import type { JourneyPrereq } from "@/lib/ui/journey";
import { formatDay, formatShortDay } from "@/lib/utils/day";
import { allInOrder } from "@/lib/utils/parallel";

const t = fr.distributionJourney;

/** Whether the project's plan was launched: the Distribution starts then
 * (proto « Projet complet », « Au lancement du plan, … la Distribution
 * démarre »). */
export const distributionLaunched = trackedCache(async (projectId: string) => {
  const { data } = await projectPlanRow(projectId);
  return data !== null;
});

/**
 * Everything the Distribution's seven steps share, read once per request
 * with the viewer's session: the dossier and its sources, the deposit
 * cycle, the platforms, the anomalies, the closure, and the journey for the
 * person looking. Null when the project is not launched or its plan not
 * yet (nothing to do there before).
 */
// Kept per project version (page loads audit, docs/ARCHITECTURE.md § 3 bis):
// plain data only, so `nameOf` (a function) is added below, on every read
// (byProjectVersion never keeps a function).
const readDistributionContext = byProjectVersion(
  "distribution-context",
  async (projectId: string) => {
    // Whether the plan was launched is read with the project, not after it.
    const [access, read, launched] = await allInOrder([
      requireApproved(),
      getProject(projectId),
      distributionLaunched(projectId),
    ]);
    if (!read || read.stages.length === 0) return null;
    // A collective's abandoned titles leave the Distribution's checks (lot 9).
    const project = countedTitlesProject(read);
    if (!launched) return null;
    const viewRead = loadDistributionView(project, access);
    const datesRead = loadProjectDates(project.id);
    const [
      view,
      tracking,
      platforms,
      anomalies,
      closure,
      dates,
      members,
      legal,
      preorder,
    ] = await Promise.all([
      viewRead,
      loadTrackingView(project, access),
      loadPlatformsView(project, access),
      loadAnomalies(project.id, access),
      loadClosureView(project, access),
      datesRead,
      loadMembers(access),
      // The Juridique's one computation of « Prêt pour la sortie »
      // (docs/ARCHITECTURE.md § 8 sexies): read, never recomputed here.
      loadLegalReadiness(project.id),
      // Only when no pre-order date is set, as soon as the view and the
      // dates are known (not after every other read).
      viewRead.then((v) =>
        v.sources.params.preorder === null
          ? datesRead.then((d) =>
              preorderProposal(project.id, d.release?.date ?? null),
            )
          : null,
      ),
    ]);
    const nameOf = (id: string | null) =>
      id ? (members.find((m) => m.personId === id)?.name ?? null) : null;
    const viewerName =
      personName(access.firstName ?? "", access.lastName ?? "") || null;

    // The validator designated in the parameters, else the one PDS OS
    // proposes: the direction (a holder of `validate`), never the owner.
    const proposed = view.validator ? null : (view.validatorOptions[0] ?? null);
    const validator = view.validator ?? proposed;
    const sources = view.sources;
    const cycle =
      tracking.current !== null
        ? cycleState(tracking.declarations, tracking.current)
        : null;
    const reference = platforms.platforms.filter((p) => p.reference);
    const latestClosure = closure.closures[0] ?? null;
    const prepSources: JourneyPrereq[] = [
      {
        key: "master",
        label: t.external.master,
        module: t.external.masterModule,
        done: sources.input.titles.every(
          (title) => title.final ?? title.before,
        ),
      },
      {
        key: "cover",
        label: t.external.cover,
        module: t.external.coverModule,
        done: sources.input.cover?.delivered != null,
      },
      ...sources.input.legal.blockers.map((b) => ({
        key: `clearance-${b.id}`,
        label: t.external.clearance(b.work),
        module: t.external.legalModule,
        done: false,
      })),
    ];
    const legalValidated = legal.allowed
      ? (legal.readiness?.validated ?? null)
      : legal.validated;
    const legalReady: JourneyPrereq = {
      key: "legal-ready",
      label: t.legalReady.label,
      module: t.legalReady.module,
      done: legalValidated !== null,
      source: legalValidated
        ? t.legalReady.validated(
            legalValidated.by,
            formatShortDay(legalValidated.at),
          )
        : t.legalReady.notValidated,
    };
    const versions = view.versions;
    const open = view.open;

    const steps = distributionJourney({
      projectId: project.id,
      owner: project.ownerPersonId
        ? {
            name: project.ownerName ?? "—",
            viewer: project.ownerPersonId === access.personId,
            viaLink: false,
          }
        : null,
      validator: validator
        ? {
            name: validator.name,
            viewer: validator.personId === access.personId,
            viaLink: false,
          }
        : null,
      prep: {
        ready: view.readiness.ready,
        total: view.readiness.total,
        blockers: view.readiness.blockers.length,
        sources: prepSources,
      },
      legalReady,
      params: sources.paramsConfirmed
        ? { confirmedBy: nameOf(sources.paramsConfirmed.byId) }
        : null,
      dossier: {
        number: open?.number ?? (versions[0]?.number ?? 0) + 1,
        open: open
          ? {
              number: open.number,
              status: open.status === "approved" ? "approved" : "pending",
            }
          : null,
        rejected: !open && versions[0]?.status === "rejected",
        drift: open?.status === "approved" && view.drift.length > 0,
      },
      cycle: cycle
        ? {
            deposit: cycle.deposit
              ? {
                  proof: Boolean(cycle.deposit.proof || cycle.deposit.proofUrl),
                }
              : null,
            received: cycle.received !== null,
            accepted: cycle.outcome?.kind === "accepted",
            delivered: cycle.delivered !== null,
          }
        : null,
      platforms: {
        verified: platforms.availability.verified,
        done: reference.every(
          (p) => p.verification === "verified" && p.compliance === "compliant",
        ),
        noLink: reference.every((p) => !p.url && !p.suggestion),
        allLooked: reference.every((p) => p.verification !== "unchecked"),
        openAnomalies: anomalies.filter(isOpen).length,
        releaseDay: dates.release ? formatDay(dates.release.date) : null,
      },
      closure:
        latestClosure &&
        !(latestClosure.status === "closed" && latestClosure.reopened)
          ? {
              status: latestClosure.status,
              kind: latestClosure.kind,
              reserves: latestClosure.reserves.length,
              openReserves: closure.reserveRows.filter(
                (r) => r.status !== "lifted",
              ).length,
              direction:
                latestClosure.kind === "cancelled" ||
                latestClosure.kind === "abandoned" ||
                latestClosure.early,
            }
          : null,
    });

    const r = fr.distribution.readiness;
    const cover = sources.input.cover;
    const statusLine = (status: keyof typeof r.sheetStatus | null) =>
      status ? r.sheetStatus[status] : r.details.coverNotDelivered;
    const { updatedAt: _updated, ...params } = sources.params;
    void _updated;
    const paramsData: ParamsData = {
      projectId: project.id,
      // The owner, until a version is submitted (then frozen).
      canEdit: view.canEdit && view.open === null,
      releaseDate: dates.release?.date ?? null,
      releaseDay: dates.release ? formatDay(dates.release.date) : null,
      params,
      territoriesText: territoriesText(sources.params),
      upc: sources.input.release?.upc ?? null,
      upcEditable: view.canEdit,
      preorderProposal: preorder,
      validator: validator
        ? {
            personId: validator.personId,
            name: validator.name,
            proposed: view.validator === null,
          }
        : null,
      validatorOptions: view.validatorOptions,
      cover: cover
        ? {
            id: cover.id,
            title: cover.title,
            line: cover.delivered
              ? r.details
                  .coverDelivered("", cover.delivered.version)
                  .replace(/^ · /, "")
              : statusLine(cover.status),
            chosen: cover.chosen,
          }
        : null,
      sheets: sources.sheets.map((sheet) => ({
        id: sheet.id,
        title: sheet.title,
        line: t.params.sheetLine(r.sheetStatus[sheet.status]),
      })),
      changedBy: changedByOf(closure.events),
    };

    return {
      legal,
      legalReady,
      paramsData,
      access,
      project,
      viewerName,
      view,
      tracking,
      cycle,
      platforms,
      anomalies,
      closure,
      dates,
      validator,
      proposedValidator: proposed,
      members,
      steps,
    };
  },
);

export const distributionContext = trackedCache(async (projectId: string) => {
  const context = await readDistributionContext(projectId);
  if (!context) return null;
  const { members, ...rest } = context;
  const nameOf = (id: string | null) =>
    id ? (members.find((m) => m.personId === id)?.name ?? null) : null;
  return { ...rest, nameOf };
});

export type DistributionContext = NonNullable<
  Awaited<ReturnType<typeof distributionContext>>
>;
