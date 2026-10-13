import { routes } from "@/lib/auth/redirects";
import { questionTaskHref } from "@/lib/master-workflow/question-types";

type LinkedTask = {
  project_id: string;
  master_question_id: string | null;
  deliverable_id: string | null;
  activation_id: string | null;
  // The follow-up's recommendation it was created from (MKT-C2-02); empty
  // when the viewer cannot see the project's strategy (RLS).
  strategy_recommendations?: { id: string }[] | null;
};

/**
 * Where a task leads: where it is done (UX test of 09/10/2026, section 5:
 * « Livrer la miniature » opened the Cadrage). The Juridique's action, the
 * Brief's question, the deliverable in the Conception, the Marketing
 * activation it was created from, the recommendation of the Stratégie's
 * follow-up it comes from; otherwise the
 * project's Travail, where it is ticked — `null` when already there.
 */
export function taskHref(
  task: LinkedTask,
  planHref: string | undefined,
  onWorkPage = false,
): string | null {
  if (planHref) return planHref;
  if (task.master_question_id) return questionTaskHref(task.project_id);
  if (task.deliverable_id)
    return routes.projectDesignDeliverable(
      task.project_id,
      task.deliverable_id,
    );
  if (task.activation_id)
    return routes.projectActivation(task.project_id, task.activation_id);
  const recommendation = task.strategy_recommendations?.[0];
  if (recommendation)
    return routes.projectStrategyRecommendation(
      task.project_id,
      recommendation.id,
    );
  return onWorkPage ? null : routes.projectWork(task.project_id);
}
