import { routes } from "@/lib/auth/redirects";
import { masterWorkflow } from "@/lib/i18n/fr/master-workflow";

const fr = { masterWorkflow };

// The internal path of the Master workflow (docs/ARCHITECTURE.md § 8
// septies), from the ticket "Workflow Master" (30/09/2026): source →
// Brief Mix/Master → Mix (versions, feedback, validation) → Mastering →
// Master final. Its own, never the project's 7 steps. Each step has its URL
// (/master/source, /brief, /mix, /mastering, /final); /master opens the step
// that waits for the person (proto « Projet complet »), /master/history the
// Historique du master.
export const MASTER_STEP_KEYS = [
  "source",
  "brief",
  "mix",
  "mastering",
  "final",
] as const;

export type MasterStepKey = (typeof MASTER_STEP_KEYS)[number];

export const isMasterStepKey = (value: string): value is MasterStepKey =>
  (MASTER_STEP_KEYS as readonly string[]).includes(value);

export const masterStepHref = (
  projectId: string,
  key: MasterStepKey | "history",
) => routes.projectMasterStep(projectId, key);

// What the person sees (Sacha, 11/10/2026, after the four milestones of
// 08/10 hid the Brief under Préparation): the five steps of the ticket's
// path. Source is the État du master, the Brief has its chevron; Mixage and
// Mastering each have their page, their validations inside (never a step of
// their own) and the sending to the engineer; the Master final closes.
// Every old URL still answers.
export const MASTER_TABS = [
  "source",
  "brief",
  "mixing",
  "mastering",
  "final",
] as const;
export type MasterTab = (typeof MASTER_TABS)[number];

/** The steps as the module's trail names them. `done`: the steps really
 * done, computed by the server. */
export function masterSteps(
  projectId: string,
  done: readonly MasterTab[] = [],
) {
  const t = fr.masterWorkflow.steps;
  const href = (key: MasterStepKey) => masterStepHref(projectId, key);
  const step = (key: MasterTab, label: string, page: MasterStepKey) => ({
    key,
    label,
    href: href(page),
    built: true,
    done: done.includes(key),
  });
  return [
    step("source", t.source, "source"),
    step("brief", t.brief, "brief"),
    step("mixing", t.mixing, "mix"),
    step("mastering", t.mastering, "mastering"),
    step("final", t.final, "final"),
  ];
}
