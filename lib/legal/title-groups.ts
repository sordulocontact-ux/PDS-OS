// A collective's Juridique, one journey per title (retour d'Ibé du
// 18/11/2026, § 3.1: « quand il y a plusieurs titres, c'est le bordel »;
// Maël 23/11/2026: « 1 par son », as the Master). The trail chooses the
// scope: « Projet » holds the Dossier, the démarches of the whole project
// (the main artist, a beatmaker or intervenant of no guest title, a
// borrowing of no title) and the Sortie; each title, in the titles' order,
// the abandoned ones last, holds what is its own: a split, a SACEM
// declaration or a borrowing of its master, the fiche and contract of each
// artist it invites (a guest of two titles in both: the same démarche, done
// once). A title not in the Catalogue yet opens on « Rattacher le titre au
// Catalogue » (§ 3.6), then « Contrats du titre » (§ 3.4, with « En attente
// de l'accord » of its guests, § 3.5, `extra`). Only for a collective: a
// project of its own keeps its journey as it is (legalJourney). Pure,
// client-safe; read by lib/legal/title-layout.ts.

import { legalContracts } from "@/lib/i18n/fr/legal-contracts";
import { legalDemarches } from "@/lib/i18n/fr/legal-demarches";
import { joinArtistNames } from "@/lib/projects/participation-rules";
import {
  masterNameOf,
  projectTitleLabel,
  titleGuestNames,
  type ProjectTitle,
} from "@/lib/projects/title-rules";
import {
  awaitingNames,
  type TitleContractNeeds,
} from "@/lib/legal/title-contracts-rules";
import { titleHue, type Hue } from "@/lib/ui/category-hues";
import type { JourneyPerson, JourneyStep } from "@/lib/ui/journey";
import {
  legalAttachHref,
  legalAttachKey,
  legalStepHref,
  legalTitleCreditsHref,
  legalTitleCreditsKey,
  legalTitleContractsHref,
  legalTitleContractsKey,
  type LegalDemarcheKind,
} from "@/lib/ui/legal-steps";

const fr = { legalContracts, legalDemarches };

const t = fr.legalDemarches;

/** A title of the collective as its group of the Juridique names it. */
export type LegalTitle = {
  // project_titles.id
  id: string;
  // Its name in the project (« Néons », « Titre de Jay (à nommer) »).
  label: string;
  // Its group's intertitle: a named title with its guests (« Néons ·
  // Jay »), an unnamed one as its label already names them; « (abandonné) »
  // after an abandoned one.
  heading: string;
  masterId: string | null;
  abandoned: boolean;
  // The artists it invites (participations neither declined nor withdrawn).
  guestArtistIds: string[];
  // Its tag's hue, as the État des lieux and the Confirmation tag it (its
  // master's rank in the project); none before it is in the Catalogue.
  hue: Hue | null;
};

/** The project's titles as the Juridique groups them, in their order (the
 * abandoned ones last, sortProjectTitles). `masterIds`: the project's
 * masters in its order, for the hue. */
export function legalTitlesOf(
  titles: ProjectTitle[],
  masterIds: string[],
): LegalTitle[] {
  return titles.map((title) => {
    const guests = titleGuestNames(title.participations);
    const name = title.workingTitle ?? masterNameOf(title.master);
    const label = projectTitleLabel({
      position: title.position,
      workingTitle: title.workingTitle,
      masterTitle: masterNameOf(title.master),
      artists: guests,
    });
    // An unnamed title's label already says its guests.
    const named =
      name && guests.length > 0
        ? t.groups.titleWith(label, joinArtistNames(guests))
        : label;
    const abandoned = title.status === "abandoned";
    const rank = title.master ? masterIds.indexOf(title.master.id) : -1;
    return {
      id: title.id,
      label,
      heading: abandoned ? t.groups.abandoned(named) : named,
      masterId: title.master?.id ?? null,
      abandoned,
      guestArtistIds: title.participations
        .filter((p) => p.status !== "declined" && p.status !== "withdrawn")
        .map((p) => p.artist.id),
      hue: rank >= 0 ? titleHue(rank) : null,
    };
  });
}

/** What ties a démarche to a title: the master of a split, a SACEM
 * declaration or a borrowing; the artist pages a person is known as (their
 * key `artist:<id>`, the artist their contact is linked to). */
export type DemarcheAnchor = {
  key: string;
  kind: LegalDemarcheKind;
  masterId: string | null;
  artistIds: string[];
};

/** The titles a démarche belongs to; none: the whole project's. A person
 * goes to each title they are a guest of (the live ones: an abandoned
 * title takes a guest only when the project has no other title for them). */
export function titlesOfDemarche(
  anchor: DemarcheAnchor,
  titles: LegalTitle[],
): LegalTitle[] {
  if (anchor.kind === "person") {
    const theirs = titles.filter((title) =>
      title.guestArtistIds.some((id) => anchor.artistIds.includes(id)),
    );
    const live = theirs.filter((title) => !title.abandoned);
    return live.length > 0 ? live : theirs;
  }
  if (!anchor.masterId) return [];
  return titles.filter((title) => title.masterId === anchor.masterId);
}

/** One journey of a collective's Juridique: « Projet » or a title. */
export type LegalScope = {
  // « project », or the title's (titleGroupKey).
  key: string;
  // null: « Projet ».
  titleId: string | null;
  // « Projet », or the title's name in the project.
  label: string;
  // A title's tag before the step's h1 (« Néons · Jay »).
  heading: string;
  hue: Hue | null;
  steps: JourneyStep[];
};

export type TitleLayout = {
  // Every title of the project (abandoned ones too), by project title id.
  titleIds: string[];
  // « Projet » first, then each title that has steps.
  scopes: LegalScope[];
};

export const PROJECT_SCOPE = "project";

/** The scope key of a title (two titles may read alike). */
export const titleGroupKey = (titleId: string) => `title:${titleId}`;

/** A step's link inside a title's journey: `?titre=` keeps the title (a
 * guest of two titles has one step in each), before any anchor. */
export function withTitre(href: string, titleId: string): string {
  const hash = href.indexOf("#");
  const path = hash >= 0 ? href.slice(0, hash) : href;
  const anchor = hash >= 0 ? href.slice(hash) : "";
  return `${path}${path.includes("?") ? "&" : "?"}titre=${titleId}${anchor}`;
}

/** The journey a step is shown in: the URL's title when that title has the
 * step, else the first scope that has it; null: not in the layout. */
export function scopeOfStep(
  layout: TitleLayout,
  stepKey: string,
  titre: string | null,
): LegalScope | null {
  const has = (scope: LegalScope) => scope.steps.some((s) => s.key === stepKey);
  return (
    layout.scopes.find((scope) => scope.titleId === titre && has(scope)) ??
    layout.scopes.find(has) ??
    null
  );
}

/** Where a scope opens: among its steps still open, the one that waits for
 * the viewer, else the first; all finished, its first. */
export function scopeEntry(scope: LegalScope): JourneyStep | null {
  const open = scope.steps.filter((s) => !stepFinished(s));
  return open.find((s) => s.actor?.viewer) ?? open[0] ?? scope.steps[0] ?? null;
}

/** A step that asks nothing more: done, or struck out (obsolete). The
 * scopes' list, the trail's switcher and their entry read it alike. */
export const stepFinished = (step: Pick<JourneyStep, "status">) =>
  step.status === "done" || step.status === "obsolete";

/** A step inside its title's group: the title is not said again, neither
 * in its title (« Répartition de l'édition », not « … « Néons » ») nor in
 * what is expected under it (« Proposer la répartition », the gestures of
 * legalDemarches.todo naming a title « de « X » »). Travail, the home and
 * the step's own page keep the journey's step, with the title. */
function inTitle(kind: LegalDemarcheKind, step: JourneyStep): JourneyStep {
  if (kind !== "split" && kind !== "sacem") return step;
  const named = step.subject ? ` de « ${step.subject} »` : null;
  return {
    ...step,
    title: t.inTitle[kind],
    actor:
      step.actor && named
        ? { ...step.actor, todo: step.actor.todo.replace(named, "") }
        : step.actor,
  };
}

/** « Rattacher au Catalogue »: a step of the spine only (Travail
 * and the project's journey never list it), open while the title has no
 * master. */
function attachStep(
  projectId: string,
  title: LegalTitle,
  owner: JourneyPerson | null,
): JourneyStep {
  return {
    key: legalAttachKey(title.id),
    href: legalAttachHref(projectId, title.id),
    title: t.attach.title,
    why: "",
    status: "current",
    owner: null,
    validator: null,
    prereq: [],
    next: [],
    actor: owner ? { ...owner, todo: t.attach.title } : null,
    summary: null,
  };
}

/** « Contrats du titre »: the first step of a live title's group after its
 * attach step, done once the Juridique confirmed the contracts it needs.
 * `awaiting`: the guests of the title whose accord is awaited, said in the
 * journey while it lasts (no contract goes before the accord). A step of the
 * spine only: it has no tools of its own. */
export function titleContractsStep(
  projectId: string,
  title: LegalTitle,
  needs: TitleContractNeeds,
  awaiting: readonly string[],
  owner: JourneyPerson | null = null,
): JourneyStep {
  const tc = t.titleContracts;
  return {
    key: legalTitleContractsKey(title.id),
    href: legalTitleContractsHref(projectId, title.id),
    title: tc.title,
    why: "",
    status: needs.confirmed ? "done" : "current",
    owner: null,
    validator: null,
    prereq: [],
    next: [],
    actor: !needs.confirmed && owner ? { ...owner, todo: tc.confirm } : null,
    summary:
      awaiting.length > 0
        ? fr.legalContracts.agreements.awaitingOf(awaitingNames(awaiting))
        : needs.confirmed
          ? needs.kinds.length > 0
            ? needs.kinds.map((kind) => tc.kinds[kind]).join(", ")
            : tc.none
          : null,
  };
}

/**
 * What a title in the Catalogue still needs before its démarches exist
 * (Sacha, 28/11/2026: once attached, its Juridique read « Terminé »): its
 * authors credited in the Catalogue (no split nor SACEM is proposed without
 * a composer, an author or an arranger), else, when the plan was launched
 * before it, its split and SACEM « Ajouter au plan » (the Plan d'action's
 * gesture). Steps of the spine only, current while they last, gone once
 * the démarches they bring are in the journey.
 */
export function titlePendingSteps(
  projectId: string,
  title: LegalTitle,
  {
    credited,
    added,
    owner,
  }: { credited: boolean; added: boolean; owner: JourneyPerson | null },
): JourneyStep[] {
  if (!title.masterId || title.abandoned) return [];
  const base = {
    why: "",
    status: "current" as const,
    owner: null,
    validator: null,
    prereq: [],
    next: [],
  };
  const actor = (todo: string) => (owner ? { ...owner, todo } : null);
  if (!credited)
    return [
      {
        ...base,
        key: legalTitleCreditsKey(title.id),
        href: legalTitleCreditsHref(projectId, title.id),
        title: t.titleCredits.title,
        summary: t.titleCredits.summary,
        actor: actor(t.titleCredits.title),
      },
    ];
  if (!added) return [];
  return [
    {
      ...base,
      key: `addplan:${title.id}`,
      href: legalStepHref(projectId, "plan"),
      title: t.titlePlan.title,
      summary: t.titlePlan.summary,
      actor: actor(t.titlePlan.title),
    },
  ];
}

/**
 * The Juridique's journeys of a collective: `steps` as legalJourney built
 * them (Dossier, démarches, Sortie), each démarche put in « Projet » or in
 * its titles' journeys (`anchors`, by step key); a person in « Projet » and
 * in their titles' journeys. A title without a master
 * and not abandoned starts with its attach step; a title with nothing in it
 * has no journey. `extra`: more steps of a title's journey, after its
 * attach step and before its démarches (« Contrats du titre »). A title's
 * steps link with `?titre=`.
 */
export function layoutByTitle(input: {
  projectId: string;
  steps: JourneyStep[];
  anchors: DemarcheAnchor[];
  titles: LegalTitle[];
  extra?: Record<string, JourneyStep[]>;
  // The project's owner, who acts on a title's own steps (attach,
  // contracts, authors, plan): « À vous » for them, else whom we wait for.
  owner?: JourneyPerson | null;
}): TitleLayout {
  const anchorOf = new Map(input.anchors.map((a) => [a.key, a]));
  const project: JourneyStep[] = [];
  const byTitle = new Map<string, JourneyStep[]>(
    input.titles.map((title) => [title.id, []]),
  );
  for (const step of input.steps) {
    const anchor = anchorOf.get(step.key);
    const titles = anchor ? titlesOfDemarche(anchor, input.titles) : [];
    if (!anchor || titles.length === 0) {
      project.push(step);
      continue;
    }
    // A person stays among the project's people too, beside their titles:
    // the Suivi lists every guest the overview asks a fiche of (test de
    // parcours du 26/11/2026).
    if (anchor.kind === "person") project.push(step);
    for (const title of titles)
      byTitle.get(title.id)?.push(inTitle(anchor.kind, step));
  }
  const scopes = input.titles.flatMap((title): LegalScope[] => {
    const own = [
      ...(title.masterId || title.abandoned
        ? []
        : [attachStep(input.projectId, title, input.owner ?? null)]),
      ...(input.extra?.[title.id] ?? []),
      ...(byTitle.get(title.id) ?? []),
    ];
    if (own.length === 0) return [];
    return [
      {
        key: titleGroupKey(title.id),
        titleId: title.id,
        label: title.label,
        heading: title.heading,
        hue: title.hue,
        steps: own.map((step) => ({
          ...step,
          href: withTitre(step.href, title.id),
          actor: step.actor?.href
            ? { ...step.actor, href: withTitre(step.actor.href, title.id) }
            : step.actor,
        })),
      },
    ];
  });
  return {
    titleIds: input.titles.map((title) => title.id),
    scopes: [
      {
        key: PROJECT_SCOPE,
        titleId: null,
        label: t.groups.project,
        heading: t.groups.project,
        hue: null,
        steps: project,
      },
      ...scopes,
    ],
  };
}
