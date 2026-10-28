import "server-only";

import { trackedCache } from "@/lib/projects/live-deps";

import { fr } from "@/lib/i18n/fr";
import { personName } from "@/lib/projects/types";
import { createClient } from "@/lib/supabase/server";
import { formatShortDay } from "@/lib/utils/day";

/** A date of the project with where it comes from (VISION-UX rule 1). */
export type ProjectDate = { date: string; source: string } | null;

export type ProjectDates = {
  // The release: projects.due_date, entered at the Lancement and validated
  // with the Brief de cadrage. releases.planned_release_date follows it
  // (trigger, supabase/migrations/20261019100101).
  release: ProjectDate;
  // The master final: the Brief Mix et Master's date, else the deadline the
  // Cadrage confirmed.
  masterFinal: ProjectDate;
};

const t = fr.projectDates;

/**
 * The project's two dates every workflow says the same way (proto « Projet
 * complet », « Sortie » and « Master final »), each with its source. One
 * reading per request. The release date is never typed elsewhere: it is
 * changed on the project (Lancement) and the Cadrage confirms it.
 */
export const loadProjectDates = trackedCache(
  async (projectId: string): Promise<ProjectDates> => {
    const supabase = await createClient();
    const [project, framing, brief, deadline] = await Promise.all([
      supabase
        .from("projects")
        .select("due_date")
        .eq("id", projectId)
        .maybeSingle(),
      supabase
        .from("project_stages")
        .select(
          "state, state_changed_at, stage:stage_definitions!inner(key), by:people!project_stages_state_changed_by_fkey(first_name, last_name)",
        )
        .eq("project_id", projectId)
        .eq("stage.key", "framing")
        .maybeSingle(),
      supabase
        .from("master_briefs")
        .select("master_final_due")
        .eq("project_id", projectId)
        .maybeSingle(),
      supabase
        .from("framing_deadlines")
        .select("due_date")
        .eq("project_id", projectId)
        .eq("kind", "master_final")
        .eq("review_status", "confirmed")
        .not("due_date", "is", null)
        .order("due_date")
        .limit(1)
        .maybeSingle(),
    ]);
    const due = project.data?.due_date ?? null;
    const validated =
      framing.data?.state === "validated" && framing.data.state_changed_at
        ? {
            by: framing.data.by
              ? personName(
                  framing.data.by.first_name,
                  framing.data.by.last_name,
                )
              : null,
            on: formatShortDay(framing.data.state_changed_at),
          }
        : null;
    const briefDue = brief.data?.master_final_due ?? null;
    const framingDue = deadline.data?.due_date ?? null;
    return {
      release: due
        ? {
            date: due,
            source: validated
              ? t.releaseValidated(validated.by, validated.on)
              : t.release,
          }
        : null,
      masterFinal: briefDue
        ? { date: briefDue, source: t.masterFinalBrief }
        : framingDue
          ? { date: framingDue, source: t.masterFinalFraming }
          : null,
    };
  },
);
