import "server-only";

import type { Access } from "@/lib/auth/access";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import type { ModuleJourney } from "@/lib/journey/types";
import { planLaunchedAt } from "@/lib/plan/queries";
import { personName, type ProjectDetail } from "@/lib/projects/types";
import { createClient } from "@/lib/supabase/server";
import type { JourneyActor, JourneyStep } from "@/lib/ui/journey";
import { formatShortDay } from "@/lib/utils/day";

const KEYS = ["start", "dimensions", "brief", "plan"] as const;
type Key = (typeof KEYS)[number];

/**
 * The Cadrage's four steps (proto « Projet complet »: Démarrer le cadrage,
 * Les 6 dimensions, Brief de cadrage, Plan du projet) read from the states
 * the app already keeps — the framing stage, its pending validation, the
 * launched plan — until the Cadrage's own journey is plugged into
 * lib/journey/ (zone Cadrage). Who acts: the project's owner, the validator
 * asked for the Brief. Computed, never stored.
 */
export async function framingFallback(
  project: ProjectDetail,
  access: Access,
): Promise<ModuleJourney> {
  const stage = project.stages.find((s) => s.key === "framing");
  const state = stage?.state ?? "not_started";
  const supabase = await createClient();
  const [launchedAt, pending] = await Promise.all([
    planLaunchedAt(project.id),
    stage && state === "awaiting_validation"
      ? supabase
          .from("validations")
          .select(
            "validator_person_id, validator:people!validations_validator_person_id_fkey(first_name, last_name)",
          )
          .eq("project_stage_id", stage.id)
          .eq("state", "pending")
          .maybeSingle()
      : null,
  ]);
  const t = fr.projectShell.framing;
  const done: Record<Key, boolean> = {
    start: state !== "not_started",
    dimensions: state === "awaiting_validation" || state === "validated",
    brief: state === "validated",
    plan: launchedAt !== null,
  };
  const current = KEYS.find((key) => !done[key]);
  const owner = (todo: string): JourneyActor | null =>
    project.ownerName
      ? {
          name: project.ownerName,
          viewer:
            access.personId !== null &&
            access.personId === project.ownerPersonId,
          viaLink: false,
          todo,
          kind: "do",
        }
      : null;
  const validator = pending?.data;
  const actorOf = (key: Key): JourneyActor | null => {
    if (key !== "brief") return owner(t.todo[key]);
    if (!validator) return null;
    const v = validator.validator;
    return {
      name: v ? personName(v.first_name, v.last_name) : "—",
      viewer: access.personId === validator.validator_person_id,
      viaLink: false,
      todo: t.todo.brief,
      kind: "validate",
    };
  };
  const href: Record<Key, string> = {
    start: routes.projectFraming(project.id),
    dimensions: routes.projectFraming(project.id),
    brief: routes.projectFramingBrief(project.id),
    plan: routes.projectPlan(project.id),
  };
  const summary: Record<Key, string | null> = {
    start: t.summary.start,
    dimensions: null,
    brief: t.summary.brief,
    plan: launchedAt
      ? t.summary.plan(formatShortDay(launchedAt, { bare: true }))
      : null,
  };
  const steps: JourneyStep[] = KEYS.map((key, index) => ({
    key,
    href: href[key],
    title: t.steps[key],
    why: t.why[key],
    status: done[key] ? "done" : key === current ? "current" : "upcoming",
    owner: null,
    validator: null,
    prereq: index > 0 ? [KEYS[index - 1]] : [],
    next: index < KEYS.length - 1 ? [KEYS[index + 1]] : [],
    actor: key === current ? actorOf(key) : null,
    summary: done[key] ? summary[key] : null,
  }));
  return { module: "framing", label: fr.shell.project.sidebar.framing, steps };
}
