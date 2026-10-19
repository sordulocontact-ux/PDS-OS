// The Distribution's « Préparation » (ticket « Distribution » § 6.2, § 12,
// proto « Projet complet », step `prep`): every element the deposit reuses,
// read from the module that owns it — Catalogue, Master, Juridique,
// Conception, Projet — with its value, where it comes from, whether it is
// ready and where it is corrected. Nothing is copied nor stored: pure,
// computed on each read from lib/distribution/sources.ts, so the server
// checks with the same rule as the screen.

import { routes } from "@/lib/auth/redirects";
import type { SheetStatus } from "@/lib/design/states";
import { fr } from "@/lib/i18n/fr";
import { withReturn } from "@/lib/ui/return-to";
import { masterStepHref } from "@/lib/ui/master-steps";

export const SOURCE_MODULES = [
  "catalog",
  "master",
  "legal",
  "design",
  "project",
] as const;
export type SourceModule = (typeof SOURCE_MODULES)[number];

// validated: present and validated in its module; available: present, in a
// module without a validation step (Catalogue); unvalidated: present but not
// validated (or not delivered) yet; missing; restricted: the viewer may not
// read it (the Juridique's detail); later: does not block the deposit.
export type ReadinessState =
  | "validated"
  | "available"
  | "unvalidated"
  | "missing"
  | "restricted"
  | "later";

export type ReadinessItem = {
  key: string;
  module: SourceModule;
  label: string;
  // The title it is about, for an element per title.
  subject: string | null;
  state: ReadinessState;
  // Must be ready before the dossier can be submitted.
  blocking: boolean;
  // What the source says, or why it is not ready, in words.
  detail: string;
  // Under the value: where it comes from and when, or what it waits for.
  source: string | null;
  // Where it is corrected: always its owner module, never Distribution.
  href: string;
  // The master final itself, listened and downloaded here without a new
  // import: the same file as the Master's (PROJ-BUG-10).
  media?: { fileName: string; listenUrl: string; downloadUrl: string | null };
};

export type ReadinessTitle = {
  id: string;
  label: string;
  // Formatted credits, « A, B feat. C ».
  artists: string;
  hasMainArtist: boolean;
  isrc: string | null;
  rightsHolder: string | null;
  rightsYear: number | null;
  contributorCount: number;
  hasSongwriter: boolean;
  updatedAt: string | null;
  final: { number: number; decidedAt: string; decidedBy: string | null } | null;
  before: { addedAt: string } | null;
  // The final file's signed links, when the viewer may read it.
  finalFile: {
    fileName: string;
    listenUrl: string | null;
    downloadUrl: string | null;
  } | null;
};

/** A borrowing not secured at the Juridique (distribution_legal_blockers):
 * readable by whoever sees the project. */
export type LegalBlocker = { id: string; work: string; status: string };

export type ReadinessLegal = {
  blockers: LegalBlocker[];
  // The Juridique's other open actions, for a reader with manage_legal
  // (null otherwise): they never block the deposit.
  open: Array<{
    id: string;
    label: string;
    reason: string;
    href: string;
  }> | null;
  // The Juridique's state in words (lib/workflow-status), if readable.
  reason: string | null;
};

/** The cover (distribution_cover): its Fiche Livrable and its delivery. */
export type ReadinessCover = {
  id: string;
  title: string;
  // Chosen in the dossier's parameters, or found by its title.
  chosen: boolean;
  status: SheetStatus | null;
  // The Production's deliverable behind the sheet, if any.
  deliverableId: string | null;
  // Delivered by the Production: the fact the Distribution waits for.
  delivered: { at: string; version: number | null } | null;
};

export type ReadinessInput = {
  projectId: string;
  titles: ReadinessTitle[];
  legal: ReadinessLegal;
  // Rights constraints confirmed in the Cadrage (readable by all).
  constraints: Array<{ id: string; text: string }>;
  cover: ReadinessCover | null;
  release: {
    title: string;
    upc: string | null;
    isrc: string | null;
    updatedAt: string;
  } | null;
  // The release date, from the project (lib/projects/dates.ts).
  releaseDate: { date: string; source: string } | null;
};

export type Readiness = {
  items: ReadinessItem[];
  // Blocking items ready / all blocking items.
  ready: number;
  total: number;
  blockers: ReadinessItem[];
  // The first blocker, in the order of the modules.
  next: ReadinessItem | null;
  // § 7: nothing blocking ready yet, some, or all (« prêt pour contrôle »).
  state: PreparationState;
};

export type PreparationState = "to_prepare" | "partial" | "ready";

const READY: readonly ReadinessState[] = ["validated", "available"];

export const isReady = (item: ReadinessItem) => READY.includes(item.state);

export function distributionReadiness(
  input: ReadinessInput,
  formatDate: (iso: string) => string,
): Readiness {
  const t = fr.distribution.readiness;
  const d = t.details;
  const items: ReadinessItem[] = [];
  const many = input.titles.length > 1;
  // A title's page, opened from here, brings back to this step once
  // corrected (PROJ-BUG-10).
  const back = routes.projectReleaseStep(input.projectId, "preparation");
  const updated = (at: string | null, where: string) =>
    at ? d.updatedOn(where, formatDate(at)) : where;

  for (const title of input.titles) {
    const subject = many ? title.label : null;
    const catalog = { module: "catalog" as const, subject, blocking: true };
    items.push(
      {
        ...catalog,
        key: `identity-${title.id}`,
        label: t.items.identity,
        state: title.hasMainArtist ? "available" : "missing",
        detail: title.hasMainArtist
          ? `« ${title.label} » · ${title.artists}`
          : d.noMainArtist,
        source: updated(title.updatedAt, d.titleSheet),
        href: withReturn(routes.master(title.id), back),
      },
      {
        ...catalog,
        key: `isrc-${title.id}`,
        label: t.items.isrc,
        state: title.isrc ? "available" : "missing",
        detail: title.isrc ?? d.noIsrc,
        source: updated(title.updatedAt, d.titleSheet),
        href: withReturn(routes.master(title.id), back),
      },
      {
        ...catalog,
        key: `credits-${title.id}`,
        label: t.items.credits,
        state: title.hasSongwriter ? "available" : "missing",
        detail: title.hasSongwriter
          ? d.credits(title.contributorCount)
          : d.noCredits,
        source: d.titleCredits,
        href: withReturn(routes.masterCredits(title.id), back),
      },
      {
        ...catalog,
        key: `pline-${title.id}`,
        label: t.items.pLine,
        state: title.rightsHolder && title.rightsYear ? "available" : "missing",
        detail:
          title.rightsHolder && title.rightsYear
            ? d.pLine(title.rightsHolder, title.rightsYear)
            : d.noPLine,
        source: d.titleRights,
        href: withReturn(routes.masterRights(title.id), back),
      },
    );
  }
  items.push({
    key: "upc",
    module: "catalog",
    label: t.items.upc,
    subject: null,
    state: input.release?.upc ? "available" : "later",
    blocking: false,
    detail: input.release?.upc ?? d.upcLater,
    source: null,
    href: routes.projectReleaseStep(input.projectId, "deposit"),
  });

  for (const title of input.titles)
    items.push({
      key: `final-${title.id}`,
      module: "master",
      label: t.items.finalMaster,
      subject: many ? title.label : null,
      blocking: true,
      ...(title.final
        ? {
            state: "validated" as const,
            detail: title.finalFile
              ? d.finalFile(title.finalFile.fileName, title.final.number)
              : d.finalVersion(title.final.number),
            source: d.finalValidated(
              formatDate(title.final.decidedAt),
              title.final.decidedBy,
            ),
          }
        : title.before
          ? {
              state: "available" as const,
              detail: title.finalFile?.fileName ?? d.finalBeforeShort,
              source: d.finalBefore(formatDate(title.before.addedAt)),
            }
          : {
              state: "missing" as const,
              detail: d.noFinal,
              source: d.finalWhere,
            }),
      href: masterStepHref(input.projectId, "final"),
      ...(title.finalFile?.listenUrl
        ? {
            media: {
              fileName: title.finalFile.fileName,
              listenUrl: title.finalFile.listenUrl,
              downloadUrl: title.finalFile.downloadUrl,
            },
          }
        : {}),
    });

  items.push(...legalItems(input));
  items.push(coverItem(input, formatDate));

  const release = input.release;
  const date = input.releaseDate;
  // The project's dates are changed on the project (Lancement), confirmed
  // by the Cadrage: never here.
  const projectHref = routes.project(input.projectId);
  items.push(
    {
      key: "release",
      module: "project",
      label: t.items.release,
      subject: null,
      state: release ? "validated" : "missing",
      blocking: true,
      detail: release ? d.releaseTitle(release.title) : d.releaseMissing,
      source: release ? (date?.source ?? d.releaseSource) : null,
      href: projectHref,
    },
    {
      key: "releaseDate",
      module: "project",
      label: t.items.releaseDate,
      subject: null,
      state: date ? "validated" : "missing",
      blocking: true,
      detail: date ? formatDate(date.date) : d.dateMissing,
      source: date?.source ?? null,
      href: projectHref,
    },
  );

  const blocking = items.filter((item) => item.blocking);
  const blockers = blocking.filter((item) => !isReady(item));
  const ready = blocking.length - blockers.length;
  return {
    items,
    ready,
    total: blocking.length,
    blockers,
    next: blockers[0] ?? null,
    state:
      blockers.length === 0 ? "ready" : ready === 0 ? "to_prepare" : "partial",
  };
}

/** Each borrowing not secured blocks (ticket Juridique 08); the rest of the
 * Juridique is said, never blocking, and only to who may read it. */
function legalItems(input: ReadinessInput): ReadinessItem[] {
  const t = fr.distribution.readiness;
  const d = t.details;
  const items: ReadinessItem[] = input.legal.blockers.map((blocker) => ({
    key: `clearance-${blocker.id}`,
    module: "legal",
    label: t.items.clearance(blocker.work),
    subject: null,
    state: "missing",
    blocking: true,
    detail: d.legalBlocking,
    source: d.clearanceStatus(
      (t.clearanceStatus as Record<string, string>)[blocker.status] ??
        blocker.status,
    ),
    href: routes.projectLegalStep(input.projectId, "clearances"),
  }));
  const open = input.legal.open;
  items.push({
    key: "legal",
    module: "legal",
    label: t.items.legalState,
    subject: null,
    state: open === null ? "restricted" : "later",
    blocking: false,
    detail:
      open === null
        ? d.legalRestricted
        : open.length === 0
          ? d.legalClear
          : (input.legal.reason ?? d.legalOpen),
    source: d.legalWhere,
    href: routes.projectLegal(input.projectId),
  });
  for (const item of open ?? [])
    items.push({
      key: `legal-${item.id}`,
      module: "legal",
      label: item.label,
      subject: null,
      state: "later",
      blocking: false,
      detail: item.reason,
      source: d.legalOpen,
      href: item.href,
    });
  for (const constraint of input.constraints)
    items.push({
      key: `constraint-${constraint.id}`,
      module: "legal",
      label: t.items.rightsConstraint,
      subject: null,
      state: "validated",
      blocking: false,
      detail: constraint.text,
      source: d.constraint,
      href: routes.projectFraming(input.projectId),
    });
  return items;
}

/** The cover: ready once the Production delivered it (proto « Pochette
 * livrée »), never on the Conception's status alone. */
function coverItem(
  input: ReadinessInput,
  formatDate: (iso: string) => string,
): ReadinessItem {
  const t = fr.distribution.readiness;
  const d = t.details;
  const cover = input.cover;
  const base = {
    key: "cover",
    module: "design" as const,
    label: t.items.cover,
    subject: null,
    blocking: true,
  };
  if (!cover)
    return {
      ...base,
      state: "missing",
      detail: d.coverNone,
      source: null,
      href: routes.projectDesign(input.projectId),
    };
  const sheet = routes.projectDesignSheet(input.projectId, cover.id);
  const production = cover.deliverableId
    ? routes.projectProductionStep(
        input.projectId,
        cover.deliverableId,
        "delivery",
      )
    : sheet;
  if (cover.delivered)
    return {
      ...base,
      state: "validated",
      detail: d.coverDelivered(cover.title, cover.delivered.version),
      source: d.coverDeliveredOn(formatDate(cover.delivered.at)),
      href: production,
    };
  const validated =
    cover.status === "ready_for_production" || cover.status === "transferred";
  return {
    ...base,
    state: "unvalidated",
    detail: d.coverStatus(
      cover.title,
      validated
        ? d.coverNotDelivered
        : cover.status
          ? t.sheetStatus[cover.status]
          : d.coverNotDelivered,
    ),
    source: cover.chosen ? d.coverWaitDelivery : d.coverGuessed,
    href: validated ? production : sheet,
  };
}
