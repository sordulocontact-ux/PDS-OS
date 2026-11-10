// Marketing › Activations, the journey of one activation as the proto
// « Projet complet » computes it (mk.js actNext, actSentence): the one
// gesture of its trunk and who does it, and the sentence of the list. Its
// phase on the frieze is computed once, in lib/activations/phase.ts.
// Computed by code at each read, never stored. Pure, client-safe.

import { isGated, phaseOf, type PhaseInput } from "@/lib/activations/phase";
import { activationJourney } from "@/lib/i18n/fr/activation-journey";
import { lowerFirst } from "@/lib/ui/journey";

const fr = { activationJourney };

const t = fr.activationJourney;

/** Who acts: a member of PDS, or a contact through her private link. */
export type ActionPerson = {
  personId: string | null;
  name: string;
  viaLink: boolean;
  viewer: boolean;
};

/**
 * One gesture an activation waits for, and who does it. `anchor`: where the
 * gesture sits in the page (the trunk's in « Maintenant », a collaboration's
 * card, a part of the press module). `rule`: what « Créer une tâche » and
 * « Sans objet » answer (trunk only); `skip`: the axis « Sans objet » sets
 * aside (proof or statistics).
 */
export type ActivationAction = {
  key: string;
  who: ActionPerson;
  todo: string;
  kind: "do" | "validate";
  anchor: string | null;
  rule?: string;
  skip?: "proof" | "stats";
};

export type TrunkInput = PhaseInput & {
  // Influence and RP in house: the proof follows the publications and the
  // coverage, the trunk never asks for a single link.
  derivedProof: boolean;
};

export type TrunkPeople = {
  owner: ActionPerson | null;
  // The project's owner, who designates when nobody is in charge.
  projectOwner: ActionPerson;
  direction: ActionPerson;
};

const act = (
  key: string,
  who: ActionPerson,
  todo: string,
  extra: Partial<ActivationAction> = {},
): ActivationAction => ({
  key: `trunk:${key}`,
  who,
  todo,
  kind: "do",
  anchor: "now",
  rule: key,
  ...extra,
});

/** The trunk's one next gesture (proto actNext), or nothing. */
export function trunkAction(
  a: TrunkInput,
  people: TrunkPeople,
): ActivationAction | null {
  if (a.status === "closed" || a.status === "cancelled") return null;
  const owner = people.owner ?? people.projectOwner;
  if (a.status === "suspended") return act("resume", owner, t.todo.resume);
  if (!people.owner)
    return act("designate", people.projectOwner, t.todo.designate);
  if (!a.dueOn) return act("due", owner, t.todo.due);
  const s = a.status;
  if (s === "to_prepare" || s === "blocked")
    return isGated(a) ? null : act("launch", owner, t.todo.launch);
  if (s === "in_progress")
    return act("declare_done", owner, t.todo.declareDone);
  if (a.derivedProof && ["to_provide", "provided_unverified"].includes(a.proof))
    return null;
  if (a.proof === "to_provide" || a.proof === "contested")
    return act(
      "evidence_missing",
      owner,
      a.proof === "contested" ? t.todo.otherProof : t.todo.proof,
      { skip: "proof" },
    );
  if (a.proof === "provided_unverified")
    return act("evidence_verify", people.direction, t.todo.verifyProof, {
      kind: "validate",
    });
  if (a.measure === "to_collect")
    return act("metrics_missing", owner, t.todo.stats, { skip: "stats" });
  return act("close", owner, t.todo.close);
}

/** The viewer's own actions first (proto: « les vôtres d'abord »). */
export const viewerFirst = (actions: ActivationAction[]) =>
  [...actions].sort((x, y) => Number(y.who.viewer) - Number(x.who.viewer));

export type SentenceInput = PhaseInput & {
  statusReason: string | null;
  // What it waits for when gated (« Clip officiel livré »).
  waitsFor: string | null;
  // The last statistic of a closed one (« 48 200 vues »).
  closedFigure: string | null;
};

/**
 * The sentence of the list (proto actSentence): « À vous · récupérer les
 * statistiques · et 2 autres », « Nadia Benali · fournir la preuve »,
 * « Attend : Clip officiel livré », « Annulée : motif », « Clôturée ·
 * 48 200 vues ». `mine`: the viewer acts (blue in the list).
 */
export function activationSentence(
  a: SentenceInput,
  actions: ActivationAction[],
): { text: string; mine: boolean } {
  if (a.status === "cancelled")
    return { text: t.sentence.cancelled(a.statusReason ?? ""), mine: false };
  if (a.status === "closed")
    return {
      text: [t.sentence.closed, a.closedFigure].filter(Boolean).join(" · "),
      mine: false,
    };
  if (isGated(a) && a.waitsFor)
    return { text: t.sentence.waits(a.waitsFor), mine: false };
  const mine = actions.find((x) => x.who.viewer);
  const first = mine ?? actions[0];
  if (!first) return { text: t.sentence.nothing, mine: false };
  return {
    text: [
      mine ? t.sentence.mine : first.who.name,
      lowerFirst(first.todo),
      actions.length > 1 ? t.sentence.more(actions.length - 1) : null,
    ]
      .filter(Boolean)
      .join(" · "),
    mine: Boolean(mine),
  };
}

export const ACTIVATION_FILTERS = ["mine", "open", "measure", "done"] as const;
export type ActivationFilter = (typeof ACTIVATION_FILTERS)[number];

/** `vue` of the URL: « En cours » by default (proto). */
export const filterOf = (value: unknown): ActivationFilter =>
  ACTIVATION_FILTERS.find((f) => f === value) ?? "open";

/** Which filters of the list an activation answers (proto ACT_FILTERS). */
export function filtersOf(
  a: PhaseInput,
  actions: ActivationAction[],
): ActivationFilter[] {
  const out: ActivationFilter[] = [];
  if (actions.some((x) => x.who.viewer)) out.push("mine");
  const ended = a.status === "closed" || a.status === "cancelled";
  out.push(ended ? "done" : "open");
  if (phaseOf(a) === 3) out.push("measure");
  return out;
}
