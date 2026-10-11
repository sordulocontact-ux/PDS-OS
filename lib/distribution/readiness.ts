// The Distribution's « contrôle de préparation » (ticket « Distribution »
// § 6.2, § 12): every element the deposit reuses, read from the module that
// owns it — Catalogue, Master, Juridique, Conception, Projet — with where it
// comes from, whether it is validated there, when it last changed and where
// it is corrected. Nothing is copied nor stored: pure, computed on each read
// from lib/distribution/sources.ts, so the server checks with the same rule.

import { routes } from "@/lib/auth/redirects";
import type { SheetStatus } from "@/lib/design/states";
import { fr } from "@/lib/i18n/fr";
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
// module without a validation step (Catalogue, the release's identifiers);
// unvalidated: present but its validation is missing or refused; missing;
// restricted: the viewer may not read it (the Juridique).
export type ReadinessState =
  "validated" | "available" | "unvalidated" | "missing" | "restricted";

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
  // How it is validated at its source, in words.
  validation: string | null;
  updatedAt: string | null;
  // Where it is corrected: always its owner module, never Distribution.
  href: string;
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
};

export type ReadinessLegal =
  | { allowed: false }
  | {
      allowed: true;
      // The Juridique's state in words (lib/workflow-status), if launched.
      reason: string | null;
      items: Array<{
        id: string;
        label: string;
        reason: string;
        // Only a borrowing to secure blocks (ticket Juridique 08).
        blocking: boolean;
        href: string;
      }>;
    };

export type ReadinessInput = {
  projectId: string;
  titles: ReadinessTitle[];
  legal: ReadinessLegal;
  // Rights constraints confirmed in the Cadrage (readable by all).
  constraints: Array<{ id: string; text: string }>;
  // The Fiche Livrable taken as the cover, if one is found.
  cover: { id: string; title: string; status: SheetStatus } | null;
  release: {
    title: string;
    plannedDate: string | null;
    upc: string | null;
    isrc: string | null;
    updatedAt: string;
  } | null;
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

  for (const title of input.titles) {
    const subject = many ? title.label : null;
    const catalog = {
      module: "catalog" as const,
      subject,
      blocking: true,
      validation: null,
      updatedAt: title.updatedAt,
    };
    items.push(
      {
        ...catalog,
        key: `identity-${title.id}`,
        label: t.items.identity,
        state: title.hasMainArtist ? "available" : "missing",
        detail: title.hasMainArtist
          ? `${title.label} · ${title.artists}`
          : d.noMainArtist,
        href: routes.master(title.id),
      },
      {
        ...catalog,
        key: `isrc-${title.id}`,
        label: t.items.isrc,
        state: title.isrc ? "available" : "missing",
        detail: title.isrc ?? d.noIsrc,
        href: routes.master(title.id),
      },
      {
        ...catalog,
        key: `credits-${title.id}`,
        label: t.items.credits,
        state: title.hasSongwriter ? "available" : "missing",
        detail: title.hasSongwriter
          ? d.credits(title.contributorCount)
          : d.noCredits,
        href: routes.masterCredits(title.id),
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
        href: routes.masterRights(title.id),
      },
    );
    items.push({
      key: `final-${title.id}`,
      module: "master",
      label: t.items.finalMaster,
      subject,
      blocking: true,
      ...(title.final
        ? {
            state: "validated" as const,
            detail: d.finalValidated(
              title.final.number,
              formatDate(title.final.decidedAt),
              title.final.decidedBy,
            ),
            validation: null,
            updatedAt: title.final.decidedAt,
          }
        : title.before
          ? {
              state: "available" as const,
              detail: d.finalBefore(formatDate(title.before.addedAt)),
              validation: d.catalogNoValidation,
              updatedAt: title.before.addedAt,
            }
          : {
              state: "missing" as const,
              detail: d.noFinal,
              validation: null,
              updatedAt: null,
            }),
      href: masterStepHref(input.projectId, "final"),
    });
  }

  if (!input.legal.allowed) {
    items.push({
      key: "legal",
      module: "legal",
      label: t.items.legalState,
      subject: null,
      state: "restricted",
      blocking: false,
      detail: d.legalRestricted,
      validation: null,
      updatedAt: null,
      href: routes.projectLegal(input.projectId),
    });
  } else {
    items.push({
      key: "legal",
      module: "legal",
      label: t.items.legalState,
      subject: null,
      state: "available",
      blocking: false,
      detail:
        input.legal.items.length === 0
          ? d.legalClear
          : (input.legal.reason ?? d.legalOpen),
      validation: null,
      updatedAt: null,
      href: routes.projectLegal(input.projectId),
    });
    for (const item of input.legal.items)
      items.push({
        key: `legal-${item.id}`,
        module: "legal",
        label: item.label,
        subject: null,
        state: item.blocking ? "missing" : "unvalidated",
        blocking: item.blocking,
        detail: item.blocking
          ? `${d.legalBlocking} · ${item.reason}`
          : item.reason,
        validation: item.blocking ? null : d.legalOpen,
        updatedAt: null,
        href: item.href,
      });
  }
  for (const constraint of input.constraints)
    items.push({
      key: `constraint-${constraint.id}`,
      module: "legal",
      label: t.items.rightsConstraint,
      subject: null,
      state: "validated",
      blocking: false,
      detail: constraint.text,
      validation: d.constraint,
      updatedAt: null,
      href: routes.projectFraming(input.projectId),
    });

  const cover = input.cover;
  const coverValidated =
    cover?.status === "ready_for_production" || cover?.status === "transferred";
  items.push({
    key: "cover",
    module: "design",
    label: t.items.cover,
    subject: null,
    state: !cover ? "missing" : coverValidated ? "validated" : "unvalidated",
    blocking: true,
    detail: !cover
      ? d.coverNone
      : coverValidated
        ? d.coverValidated(cover.title)
        : d.coverStatus(cover.title, t.sheetStatus[cover.status]),
    validation: null,
    updatedAt: null,
    href: cover
      ? routes.projectDesignSheet(input.projectId, cover.id)
      : routes.projectDesign(input.projectId),
  });

  const release = input.release;
  const prepare = `${routes.projectRelease(input.projectId)}#release-form`;
  const project = {
    module: "project" as const,
    subject: null,
    validation: null,
    updatedAt: release?.updatedAt ?? null,
    href: prepare,
  };
  items.push(
    {
      ...project,
      key: "release",
      label: t.items.release,
      state: release ? "available" : "missing",
      blocking: true,
      detail: release ? d.releaseTitle(release.title) : d.releaseMissing,
    },
    {
      ...project,
      key: "releaseDate",
      label: t.items.releaseDate,
      state: release?.plannedDate ? "available" : "missing",
      blocking: true,
      detail: release?.plannedDate
        ? formatDate(release.plannedDate)
        : d.dateMissing,
    },
    {
      ...project,
      key: "upc",
      label: t.items.upc,
      state: release?.upc ? "available" : "missing",
      blocking: false,
      detail: release?.upc ?? d.upcLater,
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
