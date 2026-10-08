import Link from "next/link";
import { IconLock } from "nucleo-sharp-essential";

import { EmptyState } from "@/components/shell/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";

/**
 * A workflow that waits for the Plan du Projet (decision of 06/10/2026):
 * nothing starts silently. Before the Brief is validated it says when it
 * will open; after, it leads to the plan, where it is launched (or added,
 * when the launched plan left it out).
 */
export function WorkflowLocked({
  projectId,
  name,
  framingValidated,
  waiting,
  absent,
}: {
  projectId: string;
  name: string;
  framingValidated: boolean;
  // Placed in Ensuite by a launched plan: waiting for « Lancer maintenant ».
  waiting: boolean;
  // Left out of the launched plan: added from it.
  absent: boolean;
}) {
  const t = fr.framingIntel.locked;
  return (
    <EmptyState
      icon={IconLock}
      title={t.title(name)}
      body={
        waiting
          ? t.bodyWaiting
          : absent
            ? t.bodyAbsent
            : framingValidated
              ? t.body
              : t.bodyBeforeBrief
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
