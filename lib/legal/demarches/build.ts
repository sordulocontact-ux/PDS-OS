// Each démarche of the Juridique's plan as a step of its journey (proto
// « Projet complet », juridique-v2.html: « Sami Kader · fiche et contrat »,
// « Emprunt « Night Lights » », « Répartition de l'édition « Néons » »,
// « Déclaration SACEM « Néons » »). Built from the launched plan's board
// (lib/legal/plan/board.ts: each step read from its source object), or from
// the proposal while the plan is not launched (locked, « Après : Plan
// d'action »). Who acts is computed here: the démarche's responsible does
// the gestures, the direction only its decisions (`kind: "validate"`),
// someone outside through their link. Pure, never stored, never PO's.

import { legal } from "@/lib/i18n/fr/legal";
import { legalDemarches } from "@/lib/i18n/fr/legal-demarches";
import { legalJourney } from "@/lib/i18n/fr/legal-journey";
import type { FormRow } from "@/lib/legal/forms/queries";
import type { BoardRow, PlanBoard } from "@/lib/legal/plan/board";
import type { PlanItem } from "@/lib/legal/plan/proposal";
import type { TrackedItem } from "@/lib/legal/tracking/state";
import type {
  JourneyActor,
  JourneyPrereq,
  JourneyStatus,
  JourneyStep,
} from "@/lib/ui/journey";
import {
  legalDemarcheHref,
  legalDemarcheKey,
  LEGAL_READY_KEY,
  type LegalDemarcheKind,
} from "@/lib/ui/legal-steps";

import { bare, expectedOf } from "./todo";

const fr = { legal, legalDemarches, legalJourney };

const t = fr.legalDemarches;

export type Demarche = {
  kind: LegalDemarcheKind;
  ref: string;
  // Who or what it is about (« Sami Kader », « Néons »).
  subject: string;
  step: JourneyStep;
  // The steps of the board behind it, in order (a person: fiche, then
  // contract); empty while the plan is only proposed.
  parts: BoardRow[];
  // The one the démarche shows (its most urgent).
  current: BoardRow | null;
  // The plan's items behind it: delegation (responsible, due date).
  items: TrackedItem[];
  // The item whose responsible and due date the démarche shows.
  own: TrackedItem | null;
  proposed: boolean;
};

export type DemarcheContext = {
  projectId: string;
  viewer: {
    personId: string | null;
    name: string | null;
    canValidate: boolean;
  };
  // The project's owner: answers for an item nobody was given.
  owner: { personId: string | null; name: string | null };
  // The direction's name when one member validates (« Claire Morel »).
  validatorName: string | null;
};

// Most urgent first (lib/legal/plan/board.ts).
const URGENCY: BoardRow["group"][] = [
  "decision",
  "now",
  "waiting",
  "silent",
  "done",
];
const KIND_ORDER: LegalDemarcheKind[] = [
  "person",
  "clearance",
  "split",
  "sacem",
];

const refOf = (id: string) => id.slice(id.indexOf(":") + 1);
const prefixOf = (id: string) => id.slice(0, id.indexOf(":"));

function kindOfPart(id: string): LegalDemarcheKind | null {
  const prefix = prefixOf(id);
  if (["person", "fiche", "contract"].includes(prefix)) return "person";
  if (prefix === "clearance") return "clearance";
  if (prefix === "splits") return "split";
  if (prefix === "formality") return "sacem";
  return null;
}

/** The board's lines as démarches: a person's line keeps its two steps, a
 * title's line becomes its split and its SACEM declaration. */
function groupLines(board: PlanBoard) {
  const out: Array<{
    kind: LegalDemarcheKind;
    ref: string;
    parts: BoardRow[];
  }> = [];
  for (const section of board.sections)
    for (const line of section.rows) {
      if (line.id === "mapping") continue;
      const parts = line.steps ?? [line];
      const kind = kindOfPart(line.id);
      if (kind === "person" || kind === "clearance") {
        out.push({ kind, ref: refOf(line.id), parts });
        continue;
      }
      // A title: one démarche per step (split, SACEM).
      for (const part of parts) {
        const k = kindOfPart(part.id);
        if (k) out.push({ kind: k, ref: refOf(part.id), parts: [part] });
      }
    }
  return out.sort(
    (a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind),
  );
}

/** Who or what the démarche is about, read from its steps' sources. */
function subjectOf(parts: BoardRow[]): string | null {
  for (const part of parts) {
    const p = part.panel;
    if (p.kind === "fiche" || p.kind === "contract") return p.row.name;
    if (p.kind === "clearance") return p.clearance.work;
    if (p.kind === "split") return p.split.title;
    if (p.kind === "sacem") return p.title.title;
  }
  return null;
}

function doneSummary(kind: LegalDemarcheKind, parts: BoardRow[]) {
  if (kind !== "person") return t.summary[kind];
  const contract = parts.find((p) => p.panel.kind === "contract");
  // No contract in the démarche (not in the plan yet): only the fiche is
  // done, never « Contrat signé » (Sacha, 06/11/2026, Inès Robin).
  if (contract?.panel.kind !== "contract") return t.summary.ficheOnly;
  return contract.panel.row.state === "not_needed"
    ? t.summary.noDeal
    : t.summary.person;
}

/** The fiches a title's démarches wait for (the plan's « onboarding »):
 * each credited person's, or one line beyond three. */
function ficheprereqs(forms: FormRow[]): JourneyPrereq[] {
  const credited = forms.filter((f) => f.creditRoles.length > 0);
  if (credited.length > 3)
    return [
      {
        key: "fiches",
        label: fr.legal.plan.items.onboarding(credited.length),
        done: credited.every((f) => f.state === "complete"),
      },
    ];
  return credited.map((f) => ({
    key: `fiche:${f.key}`,
    label: t.prereq.fiche(f.name),
    done: f.state === "complete",
  }));
}

function stateOf(
  current: BoardRow,
  parts: BoardRow[],
  own: TrackedItem | null,
  ctx: DemarcheContext,
): {
  status: JourneyStatus;
  actor: JourneyActor | null;
  alert?: JourneyStep["alert"];
} {
  if (own?.current === "obsolete") return { status: "obsolete", actor: null };
  if (parts.every((p) => p.group === "done"))
    return { status: "done", actor: null };
  if (current.group === "silent") return { status: "blocked", actor: null };
  const expected = expectedOf(current);
  const overdue = own?.overdue ? ("overdue" as const) : undefined;
  if (!expected) return { status: "current", actor: null, alert: overdue };
  // A decision is never red (Sacha, 06/11/2026): the direction's own is its
  // « À vous » (blue), anyone else waits for it (« En attente de … »,
  // yellow, as for a fiche); red stays for a due date passed.
  if (expected.who === "direction")
    return {
      status: ctx.viewer.canValidate ? "current" : "waiting",
      alert: overdue,
      actor: {
        name: ctx.viewer.canValidate
          ? (ctx.viewer.name ?? t.direction)
          : (ctx.validatorName ?? t.direction),
        viewer: ctx.viewer.canValidate,
        viaLink: false,
        todo: expected.todo,
        kind: "validate",
      },
    };
  if (expected.who === "outside")
    return {
      status: "waiting",
      alert: overdue,
      actor: {
        name: expected.name,
        viewer: false,
        viaLink: expected.viaLink,
        todo: expected.todo,
      },
    };
  const responsibleId = own?.responsibleId ?? ctx.owner.personId;
  return {
    status: "current",
    alert: overdue,
    actor: {
      name: own?.responsibleName ?? ctx.owner.name ?? "—",
      viewer: Boolean(responsibleId) && responsibleId === ctx.viewer.personId,
      viaLink: false,
      todo: expected.todo,
    },
  };
}

function ownerOf(own: TrackedItem | null, ctx: DemarcheContext) {
  return {
    name: own?.responsibleName ?? ctx.owner.name ?? "—",
    role: fr.legalJourney.owner,
  };
}

function validatorOf(kind: LegalDemarcheKind, ctx: DemarcheContext) {
  return kind === "person" || kind === "clearance"
    ? { name: ctx.validatorName ?? t.validator, role: t.validatorRole }
    : null;
}

/** The démarches of a launched plan, in the journey's order. */
export function launchedDemarches(input: {
  board: PlanBoard;
  forms: FormRow[];
  ctx: DemarcheContext;
}): Demarche[] {
  const { ctx } = input;
  const fiches = ficheprereqs(input.forms);
  const built = groupLines(input.board).map(({ kind, ref, parts }) => {
    const current = parts.reduce(
      (best, part) =>
        URGENCY.indexOf(part.group) < URGENCY.indexOf(best.group) ? part : best,
      parts[0],
    );
    const items = [
      ...new Map(
        parts.flatMap((p) => (p.item ? [[p.item.id, p.item] as const] : [])),
      ).values(),
    ];
    // A person: their contract's item (delegated per person), else the
    // fiches' item.
    const own =
      (kind === "person"
        ? items.find((i) => i.kind === "contract")
        : items[0]) ??
      items[0] ??
      null;
    const state = stateOf(current, parts, own, ctx);
    const deps = own?.dependsOn ?? [];
    const prereq = [
      "plan",
      ...deps.flatMap((dep) => {
        const k = kindOfPart(dep);
        return k ? [legalDemarcheKey(k, refOf(dep))] : [];
      }),
    ];
    const subject = bare(subjectOf(parts) ?? own?.subject ?? own?.label ?? "");
    const step: JourneyStep = {
      key: legalDemarcheKey(kind, ref),
      href: legalDemarcheHref(ctx.projectId, kind, ref),
      title: t.titles[kind](subject),
      subject,
      why: t.why[kind],
      status: state.status,
      owner: ownerOf(own, ctx),
      validator: validatorOf(kind, ctx),
      prereq,
      external:
        kind !== "person" && deps.includes("onboarding") ? fiches : undefined,
      next: [],
      actor: state.actor,
      summary:
        state.status === "done"
          ? doneSummary(kind, parts)
          : state.status === "obsolete"
            ? t.obsolete(own?.reason ?? "")
            : null,
      group: t.groups.tracking,
      alert: state.alert,
      due: own?.dueOn ?? null,
    };
    return {
      kind,
      ref,
      subject,
      step,
      parts,
      current,
      items,
      own,
      proposed: false,
    };
  });
  return withNext(built);
}

/** The démarche a plan item becomes, named as the journey will name it
 * (« Sami Kader · fiche et contrat »); none for the shared fiches. */
export function demarcheOfItem(
  item: Pick<PlanItem, "key" | "subject" | "label">,
): { kind: LegalDemarcheKind; title: string } | null {
  const kind = kindOfPart(item.key);
  if (!kind) return null;
  return { kind, title: t.titles[kind](bare(item.subject ?? item.label)) };
}

/** The démarches the code proposes while the plan is not launched: locked,
 * each waiting for the Plan d'action. */
export function proposedDemarches(input: {
  items: PlanItem[];
  ctx: DemarcheContext;
}): Demarche[] {
  const { ctx } = input;
  const built = input.items.flatMap((item): Demarche[] => {
    const demarche = demarcheOfItem(item);
    if (!demarche) return [];
    const { kind, title } = demarche;
    const ref = refOf(item.key);
    const subject = bare(item.subject ?? item.label);
    const step: JourneyStep = {
      key: legalDemarcheKey(kind, ref),
      href: legalDemarcheHref(ctx.projectId, kind, ref),
      title,
      why: t.why[kind],
      status: "blocked",
      owner: { name: ctx.owner.name ?? "—", role: fr.legalJourney.owner },
      validator: validatorOf(kind, ctx),
      prereq: ["plan"],
      next: [],
      actor: null,
      summary: null,
      group: t.groups.proposed,
    };
    return [
      {
        kind,
        ref,
        subject,
        step,
        parts: [],
        current: null,
        items: [],
        own: null,
        proposed: true,
      },
    ];
  });
  return withNext(
    built.sort(
      (a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind),
    ),
  );
}

/** What each démarche unlocks: the ones that wait for it, else « Prêt pour
 * la sortie ». A person's fiche frees the titles' démarches. */
function withNext(list: Demarche[]): Demarche[] {
  return list.map((d) => {
    const after = list.filter(
      (o) =>
        o.step.prereq.includes(d.step.key) ||
        (d.kind === "person" &&
          (o.step.external ?? []).some((p) => p.key.startsWith("fiche"))),
    );
    return {
      ...d,
      step: {
        ...d.step,
        next:
          after.length > 0 ? after.map((o) => o.step.key) : [LEGAL_READY_KEY],
      },
    };
  });
}
