// The Juridique as a journey (docs/VISION-UX.md § 4, proto « Projet
// complet », juridique-v2.html): the Dossier (État des lieux, Cadrage
// juridique, Confirmation, Plan d'action), then the Suivi where each
// démarche is a step (lib/legal/demarches/build.ts), then the Sortie
// (« Prêt pour la sortie »). Pure and client-safe: every state comes from
// what people recorded, never from PO (CLAUDE.md, rule 6). The project's
// responsible does the Dossier's gestures; the direction acts only on its
// decisions.

import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import type { JourneyPerson, JourneyStep } from "@/lib/ui/journey";
import {
  LEGAL_READY_KEY,
  legalStepHref,
  type LegalStepKey,
} from "@/lib/ui/legal-steps";

const t = fr.legalJourney;
const d = fr.legalDemarches;

export type LegalJourneyInput = {
  projectId: string;
  // The project's responsible: they do the Dossier's gestures.
  owner: JourneyPerson | null;
  ownerRole: string;
  inventory: { known: number; toConfirm: number; missing: number };
  questions: { total: number; answered: number };
  confirmation: {
    status: "not_started" | "draft" | "confirmed";
    reopened: boolean;
  };
  plan: { launched: boolean; items: number };
  // The démarches' steps, built by lib/legal/demarches/build.ts.
  demarches: JourneyStep[];
  // What blocks the release, once the plan is launched.
  ready: { blocking: number; remaining: number } | null;
  // The direction's name, when one member validates.
  direction: string | null;
};

type DossierKey = Exclude<LegalStepKey, "tracking">;

/** The Dossier's four steps, in order. */
const DOSSIER: DossierKey[] = ["inventory", "framing", "confirmation", "plan"];

const PREREQ: Record<DossierKey, DossierKey[]> = {
  inventory: [],
  framing: ["inventory"],
  confirmation: ["framing"],
  plan: ["confirmation"],
};

function dossierSteps(i: LegalJourneyInput): JourneyStep[] {
  const owner = i.owner ? { name: i.owner.name, role: i.ownerRole } : null;
  const actor = (todo: string) => (i.owner ? { ...i.owner, todo } : null);
  const open = i.questions.total - i.questions.answered;
  const done: Record<DossierKey, boolean> = {
    inventory: true,
    framing:
      i.questions.total === 0 || i.questions.answered === i.questions.total,
    confirmation: i.confirmation.status === "confirmed",
    plan: i.plan.launched,
  };
  const todo: Record<DossierKey, string> = {
    inventory: "",
    framing: t.todo.framing(open),
    confirmation: i.confirmation.reopened
      ? t.todo.confirmAgain
      : t.todo.confirm,
    plan: t.todo.launch,
  };
  const summary: Record<DossierKey, string | null> = {
    inventory: t.summary.inventory(
      i.inventory.known,
      i.inventory.toConfirm,
      i.inventory.missing,
    ),
    framing:
      i.questions.total === 0
        ? t.summary.nothingToAsk
        : t.summary.answers(i.questions.answered),
    confirmation: t.summary.confirmed,
    plan: t.summary.launched(i.demarches.length || i.plan.items),
  };
  const status = new Map<string, JourneyStep["status"]>();
  return DOSSIER.map((key) => {
    const ready = PREREQ[key].every((p) => status.get(p) === "done");
    const st: JourneyStep["status"] = done[key]
      ? "done"
      : ready
        ? "current"
        : "blocked";
    status.set(key, st);
    return {
      key,
      href: legalStepHref(i.projectId, key),
      title: t.steps[key].title,
      why: t.steps[key].why,
      status: st,
      owner,
      validator: null,
      prereq: PREREQ[key],
      next:
        key === "plan"
          ? i.demarches.map((s) => s.key)
          : DOSSIER.filter((k) => PREREQ[k].includes(key)),
      actor: st === "current" && key !== "inventory" ? actor(todo[key]) : null,
      summary: summary[key],
      group: d.groups.dossier,
    };
  });
}

/** « Prêt pour la sortie », computed at each read (ticket Juridique 08). */
function readyStep(i: LegalJourneyInput): JourneyStep {
  const direction = i.direction ?? d.direction;
  const r = i.ready;
  return {
    key: LEGAL_READY_KEY,
    href: routes.projectLegalStep(i.projectId, LEGAL_READY_KEY),
    title: d.titles.ready,
    why: d.why.ready,
    status: r ? "current" : "blocked",
    owner: { name: direction, role: d.readyRole },
    validator: { name: direction, role: d.readyRole },
    prereq: ["plan"],
    next: [],
    actor: null,
    summary: !r
      ? null
      : r.blocking > 0
        ? d.ready.summary.no(r.blocking)
        : r.remaining > 0
          ? d.ready.summary.risk
          : d.ready.summary.ok,
    group: d.groups.release,
  };
}

export function legalJourney(input: LegalJourneyInput): JourneyStep[] {
  return [...dossierSteps(input), ...input.demarches, readyStep(input)];
}
