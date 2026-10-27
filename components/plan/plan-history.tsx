import { PageSection } from "@/components/shell/page-section";
import { framingIntel } from "@/lib/i18n/fr/framing-intel";
import { planSteps } from "@/lib/i18n/fr/plan-steps";
import type { PlanWorkflow } from "@/lib/plan/propose";
import type { LaunchedItem, PlanEvent } from "@/lib/plan/queries";

const fr = { framingIntel, planSteps };

const dateFormat = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Paris",
});

const FIELDS = [
  "column",
  "owner",
  "executor",
  "dueDate",
  "dependsOn",
  "title",
] as const;

/** The fields a change touched, compared before / after. */
function changedFields(detail: Record<string, unknown>): string[] {
  const before = (detail.before ?? {}) as Record<string, unknown>;
  const after = (detail.after ?? {}) as Record<string, unknown>;
  return FIELDS.filter(
    (f) =>
      JSON.stringify(before[f] ?? null) !== JSON.stringify(after[f] ?? null),
  ).map((f) => fr.planSteps.history.changes[f]);
}

/**
 * « Historique du plan » (PROJ-UX-07): the launch, then every step added,
 * changed, moved or done, with who and when; folded by default.
 */
export function PlanHistory({
  events,
  items,
}: {
  events: PlanEvent[];
  items: LaunchedItem[];
}) {
  const t = fr.planSteps.history;
  const titleOf = (id: string | null) =>
    items.find((i) => i.id === id)?.title ?? "—";
  const phrase = (e: PlanEvent): string => {
    switch (e.kind) {
      case "launched":
        return t.kinds.launched(Number(e.detail.steps ?? 0));
      case "workflow_launched":
        return t.kinds.workflow_launched(
          fr.framingIntel.plan.workflows[e.detail.workflow as PlanWorkflow] ??
            titleOf(e.itemId),
        );
      case "step_added":
      case "step_updated":
      case "step_moved":
      case "step_done":
      case "step_reopened":
        return t.kinds[e.kind](titleOf(e.itemId));
      default:
        return e.kind;
    }
  };
  return (
    <PageSection
      id="plan-history"
      title={t.title}
      collapsible
      defaultOpen={false}
    >
      {events.length === 0 ? (
        <p className="text-body-md text-muted-foreground">{t.empty}</p>
      ) : (
        <ol className="flex flex-col gap-3">
          {events.map((e) => {
            const fields =
              e.kind === "step_updated" ? changedFields(e.detail) : [];
            return (
              <li key={e.id} className="flex flex-col gap-0.5">
                <span className="text-body-md font-semibold">{phrase(e)}</span>
                {fields.length > 0 && (
                  <span className="text-caption">
                    {t.changed(fields.join(", "))}
                  </span>
                )}
                <span className="text-caption text-muted-foreground">
                  {t.by(e.actorName, dateFormat.format(new Date(e.createdAt)))}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </PageSection>
  );
}
