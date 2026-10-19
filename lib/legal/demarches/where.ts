// Where an address of the Juridique lands (proto « Projet complet »): the
// section's entry opens the step that awaits the viewer; the former Suivi
// (`?ligne=`) and branch pages (/forms, /contracts, /splits, /clearances,
// /formalities), still named by notifications, tasks and other modules,
// open the démarche they were about. Pure, client-safe.

import type { Demarche } from "@/lib/legal/demarches/build";
import type { LegalBranchPage } from "@/lib/ui/legal-steps";
import { legalStepHref, type LegalDemarcheKind } from "@/lib/ui/legal-steps";
import type { JourneyStep } from "@/lib/ui/journey";

/** /legal: the step that awaits the viewer, else the current one, else the
 * État des lieux; `?question=` and `?state=` keep their step. */
export function entryHref(
  projectId: string,
  steps: JourneyStep[],
  query: Record<string, string | string[] | undefined>,
): string {
  if (typeof query.question === "string")
    return `${legalStepHref(projectId, "framing")}?question=${encodeURIComponent(query.question)}`;
  if (typeof query.state === "string")
    return `${legalStepHref(projectId, "inventory")}?state=${encodeURIComponent(query.state)}`;
  const target =
    steps.find((s) => s.actor?.viewer) ??
    steps.find((s) => s.status === "current" && s.actor) ??
    steps.find((s) => s.status === "current");
  return target?.href ?? legalStepHref(projectId, "inventory");
}

const KINDS_OF: Record<
  Exclude<LegalBranchPage, "history"> | "tracking",
  LegalDemarcheKind[]
> = {
  forms: ["person"],
  contracts: ["person"],
  splits: ["split"],
  formalities: ["sacem"],
  clearances: ["clearance"],
  tracking: ["person", "clearance", "split", "sacem"],
};

// A line of the former Suivi (« person:<key> », « title:<id> »…) → its
// démarche.
function lineKey(
  line: string,
): { kind: LegalDemarcheKind; ref: string } | null {
  const colon = line.indexOf(":");
  if (colon < 0) return null;
  const prefix = line.slice(0, colon);
  const ref = line.slice(colon + 1);
  if (["person", "fiche", "contract"].includes(prefix))
    return { kind: "person", ref };
  if (prefix === "clearance") return { kind: "clearance", ref };
  if (prefix === "title" || prefix === "splits") return { kind: "split", ref };
  if (prefix === "formality") return { kind: "sacem", ref };
  return null;
}

/** The démarche a former page or line opens: the one it names, else the
 * first of its kind that awaits the viewer, else the first open one, else
 * the first; none at all → the Plan d'action. */
export function demarcheTarget(
  projectId: string,
  demarches: Demarche[],
  page: Exclude<LegalBranchPage, "history"> | "tracking",
  named: string | null,
): string {
  const kinds = KINDS_OF[page];
  if (named) {
    const key =
      page === "clearances"
        ? { kind: "clearance" as const, ref: named }
        : lineKey(named);
    const hit =
      key && demarches.find((d) => d.kind === key.kind && d.ref === key.ref);
    if (hit) return hit.step.href;
  }
  const theirs = demarches.filter((d) => kinds.includes(d.kind));
  const target =
    theirs.find((d) => d.step.actor?.viewer) ??
    theirs.find(
      (d) => d.step.status === "current" || d.step.status === "waiting",
    ) ??
    theirs[0];
  return target?.step.href ?? legalStepHref(projectId, "plan");
}
