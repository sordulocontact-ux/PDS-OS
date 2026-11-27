// The Distribution's « Préparation » (ticket « Distribution » § 6.2, § 12,
// proto « Projet complet », step `prep`): every element the deposit reuses,
// read from the module that owns it — Catalogue, Master, Juridique,
// Conception, Projet — with its value, where it comes from, whether it is
// ready and where it is corrected. Nothing is copied nor stored: pure,
// computed on each read from lib/distribution/sources.ts, so the server
// checks with the same rule as the screen.

import { routes } from "@/lib/auth/redirects";
import type { SheetStatus } from "@/lib/design/states";
import { distribution } from "@/lib/i18n/fr/distribution";
import { withRelease } from "@/lib/distribution/scope";
import { withReturn } from "@/lib/ui/return-to";
import { masterStepHref } from "@/lib/ui/master-steps";
import { formatShortDay } from "@/lib/utils/day";

const fr = { distribution };

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
  // A collective's track (lot 15): as the platforms receive it — the
  // project's artist as main artist, the title's confirmed guests in
  // featuring, « Marina (feat. Lou Vega) » (décision 10).
  delivery?: TrackDelivery;
};

export type TrackDelivery = {
  title: string;
  main: string;
  featuring: string[];
  // The project's artist is not a main credit of the title in the Catalogue.
  missingMain: boolean;
  // Confirmed guests not credited in featuring in the Catalogue.
  missingFeaturing: string[];
  // « feat. … » written in the Catalogue's title, taken out (the
  // Distribution writes it under the platforms' rules).
  cleaned: boolean;
};

/** A collective's release (lot 15): what its deposit also waits for. */
export type ReadinessCollective = {
  kind: "title" | "compilation";
  // « Titres et artistes », where names are settled; « Participations et
  // contrats » (Juridique), where contracts and waivers are.
  titlesHref: string;
  contractsHref: string;
  // Confirmed participations without a signed contract nor a release
  // waiver, named; null: none.
  contracts: string | null;
  // The release's titles still under a provisional name (lot 7).
  provisional: string[];
  // The compilation's active titles not in the Catalogue yet.
  withoutMaster: string[];
  // A title's release: its title's cover in the Catalogue.
  catalogCover: { masterId: string; fileName: string | null } | null;
};

/** A borrowing not secured at the Juridique (distribution_legal_blockers):
 * readable by whoever sees the project. */
export type LegalBlocker = { id: string; work: string; status: string };

export type ReadinessLegal = {
  blockers: LegalBlocker[];
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
  collective?: ReadinessCollective | null;
  // A collective's release (lot 15), kept in this module's addresses.
  releaseId?: string | null;
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
  const back = withRelease(
    routes.projectReleaseStep(input.projectId, "preparation"),
    input.releaseId,
  );
  // Sources say their date short (« le 12/10 », C0 decision 8).
  const short = (at: string) => formatShortDay(at, { bare: true });
  const updated = (at: string | null, where: string) =>
    at ? d.updatedOn(where, short(at)) : where;

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
    // Typed in the Paramètres de distribution, checked by the code.
    href: withRelease(
      routes.projectReleaseStep(input.projectId, "params"),
      input.releaseId,
    ),
  });
  items.push(...platformItems(input, back));

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
              short(title.final.decidedAt),
              title.final.decidedBy,
            ),
          }
        : title.before
          ? {
              state: "available" as const,
              detail: title.finalFile?.fileName ?? d.finalBeforeShort,
              source: d.finalBefore(short(title.before.addedAt)),
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
  items.push(...collectiveItems(input, back));
  // A title's release: the Production's cover once delivered for it (M7),
  // else its title's cover in the Catalogue.
  items.push(
    input.collective?.kind === "title" && !input.cover?.delivered
      ? titleCoverItem(input.collective, back)
      : coverItem(input, formatDate),
  );

  const release = input.release;
  const date = input.releaseDate;
  // The project's dates are changed on the project (Lancement), confirmed
  // by the Cadrage: never here.
  // A collective's title release (lot 15): its date is set in « Sorties »
  // (the compilation's is the project's due date, as before).
  const titleRelease = input.collective?.kind === "title";
  const projectHref = titleRelease
    ? routes.projectReleases(input.projectId)
    : routes.project(input.projectId);
  items.push(
    {
      key: "release",
      module: "project",
      label: t.items.release,
      subject: null,
      state: release ? "validated" : "missing",
      blocking: true,
      detail: release ? d.releaseTitle(release.title) : d.releaseMissing,
      source: release
        ? (date?.source ??
          (titleRelease ? t.collective.releaseSource : d.releaseSource))
        : null,
      href: projectHref,
    },
    {
      key: "releaseDate",
      module: "project",
      label: t.items.releaseDate,
      subject: null,
      state: date ? "validated" : "missing",
      blocking: true,
      detail: date
        ? formatDate(date.date)
        : titleRelease
          ? t.collective.dateMissing
          : d.dateMissing,
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

/** A collective's tracks as the platforms receive them (lot 15, décision
 * 10): the project's artist as main artist, the confirmed guests in
 * featuring and in the title. The rule is applied to the delivery file;
 * what the Catalogue lacks for it blocks. */
function platformItems(input: ReadinessInput, back: string): ReadinessItem[] {
  const t = fr.distribution.readiness;
  const c = t.collective;
  const many = input.titles.length > 1;
  return input.titles.flatMap((title) => {
    const d = title.delivery;
    if (!d) return [];
    const missing = d.missingMain || d.missingFeaturing.length > 0;
    return [
      {
        key: `platforms-${title.id}`,
        module: "catalog" as const,
        label: t.items.platformCredits,
        subject: many ? title.label : null,
        state: missing ? ("missing" as const) : ("available" as const),
        blocking: true,
        detail: d.missingMain
          ? c.missingMain(d.main)
          : d.missingFeaturing.length
            ? c.missingFeaturing(d.missingFeaturing.join(", "))
            : c.delivered(d.title, d.main, d.featuring),
        source: d.cleaned ? c.cleaned : c.rules,
        href: withReturn(routes.masterCredits(title.id), back),
      },
    ];
  });
}

/** What a collective's release also waits for (lot 15): its titles named,
 * in the Catalogue, their contracts signed or waived (lot 12). */
function collectiveItems(input: ReadinessInput, back: string): ReadinessItem[] {
  const collective = input.collective;
  if (!collective) return [];
  const t = fr.distribution.readiness;
  const c = t.collective;
  const titles = withReturn(collective.titlesHref, back);
  return [
    ...collective.provisional.map((label) => ({
      key: `provisional-${label}`,
      module: "project" as const,
      label: t.items.provisional,
      subject: label,
      state: "missing" as const,
      blocking: true,
      detail: c.provisional(),
      source: c.contractsSource,
      href: titles,
    })),
    ...collective.withoutMaster.map((label) => ({
      key: `track-${label}`,
      module: "catalog" as const,
      label: t.items.trackInCatalogue,
      subject: label,
      state: "missing" as const,
      blocking: true,
      detail: c.withoutMaster(label),
      source: c.contractsSource,
      href: titles,
    })),
    {
      key: "contracts",
      module: "legal" as const,
      label: t.items.contracts,
      subject: null,
      state: collective.contracts
        ? ("missing" as const)
        : ("validated" as const),
      blocking: true,
      detail: collective.contracts
        ? c.contractsMissing(collective.contracts)
        : c.contractsOk,
      source: c.contractsWhere,
      href: withReturn(collective.contractsHref, back),
    },
  ];
}

/** A title's release (lot 15): its title's cover, in the Catalogue. */
function titleCoverItem(
  collective: ReadinessCollective,
  back: string,
): ReadinessItem {
  const t = fr.distribution.readiness;
  const c = t.collective;
  const cover = collective.catalogCover;
  return {
    key: "cover",
    module: "catalog",
    label: t.items.titleCover,
    subject: null,
    state: cover?.fileName ? "available" : "missing",
    blocking: true,
    detail: cover?.fileName ? c.coverFile(cover.fileName) : c.coverNone,
    source: c.coverSource,
    href: cover
      ? withReturn(routes.masterFiles(cover.masterId), back)
      : collective.titlesHref,
  };
}

/** Each borrowing not secured blocks (ticket Juridique 08); the rest of the
 * Juridique (« Prêt pour la sortie ») is read from its own computation,
 * loadLegalReadiness, by the step itself — never recomputed here. */
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
      source: d.coverDeliveredOn(
        formatShortDay(cover.delivered.at, { bare: true }),
      ),
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
