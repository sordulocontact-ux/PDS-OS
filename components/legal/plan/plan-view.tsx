import Link from "next/link";
import { IconScale } from "nucleo-sharp-essential";

import { PlanForm } from "@/components/legal/plan/plan-form";
import { EmptyState } from "@/components/shell/empty-state";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/auth/redirects";
import { legal } from "@/lib/i18n/fr/legal";
import type { LegalPlan } from "@/lib/legal/plan/queries";

const fr = { legal };

/** Juridique's fourth step before its launch: the dossier to confirm
 * first, or the plan to launch. */
export function PlanView({
  projectId,
  plan,
}: {
  projectId: string;
  plan: LegalPlan;
}) {
  const t = fr.legal.plan;
  if (plan.state === "needs_confirmation")
    return (
      <div className="grid gap-8">
        <EmptyState
          icon={IconScale}
          title={t.needsConfirmation.title}
          body={t.needsConfirmation.body}
          action={
            <Button
              nativeButton={false}
              render={
                <Link
                  href={routes.projectLegalStep(projectId, "confirmation")}
                />
              }
            >
              {t.needsConfirmation.action}
            </Button>
          }
        />
      </div>
    );

  // Launched, the step shows its démarches (PlanStep, LaunchedDemarches).
  if (plan.state !== "proposal") return null;
  return (
    <div className="grid gap-8">
      <PlanForm projectId={projectId} items={plan.items} people={plan.people} />
    </div>
  );
}
