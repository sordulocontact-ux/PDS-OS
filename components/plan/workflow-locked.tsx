import Link from "next/link";
import { IconLock } from "nucleo-sharp-essential";

import { EmptyState } from "@/components/shell/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";

/**
 * A workflow that waits for the Plan du Projet (decision of 06/10/2026):
 * nothing starts silently. Before the Brief is validated it says when it
 * will open; after, it leads to the plan, where it is launched.
 */
export function WorkflowLocked({
  projectId,
  name,
  framingValidated,
  waiting,
}: {
  projectId: string;
  name: string;
  framingValidated: boolean;
  // Placed in Ensuite by a launched plan: waiting for « Lancer maintenant ».
  waiting: boolean;
}) {
  const t = fr.framingIntel.locked;
  return (
    <EmptyState
      icon={IconLock}
      title={t.title(name)}
      body={
        waiting ? t.bodyWaiting : framingValidated ? t.body : t.bodyBeforeBrief
      }
      action={
        <Link
          href={
            framingValidated
              ? routes.projectPlan(projectId)
              : routes.projectFraming(projectId)
          }
          className={buttonVariants({ size: "lg" })}
        >
          {framingValidated ? t.openPlan : t.openFraming}
        </Link>
      }
    />
  );
}
