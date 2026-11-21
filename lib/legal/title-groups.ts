// A collective's Juridique, one group per title (retour d'Ibé du 18/11/2026,
// § 3.1: « quand il y a plusieurs titres, c'est le bordel », « comment
// savoir sur lequel on est ? »). The Dossier stays the project's; then
// « Projet » holds the démarches of the whole project (the main artist, a
// beatmaker of several titles, the intervenants, a borrowing of no title);
// then one group per title, in the titles' order, the abandoned ones last:
// a split, a SACEM declaration or a borrowing of its master, the fiche and
// contract of the artist it invites when that artist is the guest of this
// title only; then the Sortie. A title not in the Catalogue yet opens on
// « Rattacher le titre au Catalogue » (§ 3.6). Only for a collective: a
// project of its own keeps its journey as it is (legalJourney). Pure,
// client-safe; read by lib/legal/title-layout.ts.
//
// A title's group is where what belongs to that title alone goes: its
// contracts and « En attente de l'accord » (lot L3b) are steps of the
// démarches given to it here (`titleOfDemarche`), or steps added to its
// group by `layoutByTitle` (`extra`), as the attach step is.

import { legalDemarches } from "@/lib/i18n/fr/legal-demarches";
import { joinArtistNames } from "@/lib/projects/participation-rules";
import {
  masterNameOf,
  projectTitleLabel,
  titleGuestNames,
  type ProjectTitle,
} from "@/lib/projects/title-rules";
import { titleHue, type Hue } from "@/lib/ui/category-hues";
import type { JourneyStep } from "@/lib/ui/journey";
import {
  legalAttachHref,
  legalAttachKey,
  LEGAL_READY_KEY,
  type LegalDemarcheKind,
} from "@/lib/ui/legal-steps";

const fr = { legalDemarches };

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

/** The title a démarche belongs to; null: the whole project's. A person
 * goes to a title only as the guest of that title alone (of a live one
 * first: an abandoned title does not take a guest the project still has). */
export function titleOfDemarche(
  anchor: DemarcheAnchor,
  titles: LegalTitle[],
): LegalTitle | null {
  if (anchor.kind === "person") {
    const theirs = titles.filter((title) =>
      title.guestArtistIds.some((id) => anchor.artistIds.includes(id)),
    );
    const live = theirs.filter((title) => !title.abandoned);
    if (live.length === 1) return live[0];
    return live.length === 0 && theirs.length === 1 ? theirs[0] : null;
  }
  if (!anchor.masterId) return null;
  return titles.find((title) => title.masterId === anchor.masterId) ?? null;
}

/** The title a step of a title's group is about, for the head of the step. */
export type StepTitle = {
  id: string;
  label: string;
  heading: string;
  hue: Hue | null;
};

export type TitleLayout = {
  // The spine's steps: the Dossier, « Projet », each title, the Sortie.
  steps: JourneyStep[];
  // The titles' groups, folded but the one of the open step.
  foldable: string[];
  // Each step of a title's group → its title.
  titleOf: Record<string, StepTitle>;
};

/** The group key of a title (two titles may read alike). */
export const titleGroupKey = (titleId: string) => `title:${titleId}`;

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

/** « Rattacher le titre au Catalogue »: a step of the spine only (Travail
 * and the project's journey never list it), open while the title has no
 * master. */
function attachStep(projectId: string, title: LegalTitle): JourneyStep {
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
    actor: null,
    summary: null,
  };
}

/**
 * The Juridique's journey of a collective, regrouped: `steps` as
 * legalJourney built them (Dossier, démarches, Sortie), each démarche put
 * in « Projet » or in its title's group (`anchors`, by step key). A title
 * without a master and not abandoned starts with its attach step; a title
 * with nothing in it has no group. `extra`: more steps of a title's group,
 * after its démarches (lot L3b).
 */
export function layoutByTitle(input: {
  projectId: string;
  steps: JourneyStep[];
  anchors: DemarcheAnchor[];
  titles: LegalTitle[];
  extra?: Record<string, JourneyStep[]>;
}): TitleLayout {
  const anchorOf = new Map(input.anchors.map((a) => [a.key, a]));
  const dossier: JourneyStep[] = [];
  const project: JourneyStep[] = [];
  const release: JourneyStep[] = [];
  const byTitle = new Map<string, JourneyStep[]>(
    input.titles.map((title) => [
      title.id,
      title.masterId || title.abandoned
        ? []
        : [attachStep(input.projectId, title)],
    ]),
  );
  for (const step of input.steps) {
    const anchor = anchorOf.get(step.key);
    if (!anchor) {
      (step.key === LEGAL_READY_KEY ? release : dossier).push(step);
      continue;
    }
    const title = titleOfDemarche(anchor, input.titles);
    if (!title) {
      project.push({ ...step, group: t.groups.project });
      continue;
    }
    byTitle.get(title.id)?.push(inTitle(anchor.kind, step));
  }
  const titleOf: Record<string, StepTitle> = {};
  const foldable: string[] = [];
  const grouped = input.titles.flatMap((title) => {
    const own = [
      ...(byTitle.get(title.id) ?? []),
      ...(input.extra?.[title.id] ?? []),
    ];
    if (own.length === 0) return [];
    const groupKey = titleGroupKey(title.id);
    foldable.push(groupKey);
    return own.map((step) => {
      titleOf[step.key] = {
        id: title.id,
        label: title.label,
        heading: title.heading,
        hue: title.hue,
      };
      return { ...step, group: title.heading, groupKey };
    });
  });
  return {
    steps: [...dossier, ...project, ...grouped, ...release],
    foldable,
    titleOf,
  };
}
