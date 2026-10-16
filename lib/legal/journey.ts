// The Juridique as a journey of five steps (docs/VISION-UX.md § 4). Pure and
// client-safe: every state comes from what people recorded, never from PO
// (CLAUDE.md, rule 6). Where each step lives: lib/ui/legal-steps.ts.

import { fr } from "@/lib/i18n/fr";
import type { JourneyPerson, JourneyStep } from "@/lib/ui/journey";
import {
  LEGAL_STEP_KEYS,
  legalStepHref,
  type LegalStepKey,
} from "@/lib/ui/legal-steps";

const t = fr.legalJourney;

export type LegalJourneyInput = {
  projectId: string;
  // The project's responsible chef de projet; `viewer` = the one looking.
  owner: JourneyPerson | null;
  ownerRole: string;
  // Who acts on the open step: the person looking, since everyone who sees
  // the Juridique (manage_legal) acts on it, owner of the project or not.
  actor: JourneyPerson | null;
  inventory: { known: number; toConfirm: number; missing: number };
  questions: { total: number; answered: number };
  confirmation: {
    status: "not_started" | "draft" | "confirmed";
    reopened: boolean;
  };
  plan: { launched: boolean; items: number };
  // Null while the plan is not launched.
  tracking: { total: number; open: number; done: number } | null;
};

export type LegalJourneyStep = Omit<JourneyStep, "key" | "prereq" | "next"> & {
  key: LegalStepKey;
  prereq: LegalStepKey[];
  next: LegalStepKey[];
};

const PREREQ: Record<LegalStepKey, LegalStepKey[]> = {
  inventory: [],
  framing: ["inventory"],
  confirmation: ["framing"],
  plan: ["confirmation"],
  tracking: ["plan"],
};

export function legalJourney(input: LegalJourneyInput): LegalJourneyStep[] {
  const i = input;
  const owner = i.owner ? { name: i.owner.name, role: i.ownerRole } : null;
  const actor = (todo: string) => (i.actor ? { ...i.actor, todo } : null);
  const open = i.questions.total - i.questions.answered;
  const tracking = i.tracking;
  const trackingOpen = tracking?.open ?? 0;

  const done: Record<LegalStepKey, boolean> = {
    inventory: true,
    framing:
      i.questions.total === 0 || i.questions.answered === i.questions.total,
    confirmation: i.confirmation.status === "confirmed",
    plan: i.plan.launched,
    tracking: tracking !== null && tracking.total > 0 && tracking.open === 0,
  };
  const todo: Record<LegalStepKey, string> = {
    inventory: "",
    framing: t.todo.framing(open),
    confirmation: i.confirmation.reopened
      ? t.todo.confirmAgain
      : t.todo.confirm,
    plan: t.todo.launch,
    tracking: t.todo.track(trackingOpen),
  };
  const summary: Record<LegalStepKey, string | null> = {
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
    plan: t.summary.launched(i.plan.items),
    tracking: t.summary.allDone,
  };

  const status = new Map<LegalStepKey, JourneyStep["status"]>();
  return LEGAL_STEP_KEYS.map((key) => {
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
      validator: key === "tracking" ? { ...t.validator } : null,
      prereq: PREREQ[key],
      next: LEGAL_STEP_KEYS.filter((k) => PREREQ[k].includes(key)),
      actor: st === "current" && key !== "inventory" ? actor(todo[key]) : null,
      summary: summary[key],
    };
  });
}
