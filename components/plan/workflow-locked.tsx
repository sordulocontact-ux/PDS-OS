import { IconLock } from "nucleo-sharp-essential";

import { ProjectHeader } from "@/components/projects/project-header";
import { ContentCard } from "@/components/shell/content-card";
import { buttonVariants, ButtonRoll } from "@/components/ui/button";
import { ViewLink } from "@/components/ui/view-link";
import { routes } from "@/lib/auth/redirects";
import { projectShell } from "@/lib/i18n/fr/project-shell";

const fr = { projectShell };

/**
 * A workflow before « Lancer le plan » (proto « Projet complet », `locked()`):
 * its head with « Non démarré », then one card that says when it starts and
 * leads to the Cadrage, where the plan is built and launched. The same for
 * the Master, the Juridique, the Marketing and the Distribution.
 */
export function WorkflowLocked({
  projectId,
  title,
  gate,
}: {
  projectId: string;
  // The workflow's name when the URL names a part of it (the Marketing's
  // Stratégie).
  title?: string;
  // Why it is locked (workflowGate): left out of a launched plan, or in it
  // and waiting; none = the plan is not launched yet.
  gate?: { absent: boolean; waiting: boolean } | null;
}) {
  const t = fr.projectShell;
  const inPlan = gate?.absent || gate?.waiting;
  const body = gate?.absent
    ? t.locked.absentBody
    : gate?.waiting
      ? t.locked.waitingBody
      : t.locked.body;
  return (
    <div className="flex flex-col gap-5">
      <ProjectHeader
        projectId={projectId}
        title={title}
        facts={[]}
        status={{ label: t.status.notStarted, tone: "neutral" }}
      />
      <ContentCard label={body}>
        <p className="flex items-start gap-2.5 text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)] modern:gap-2">
          <IconLock aria-hidden className="mt-0.5 size-3.5 shrink-0" />
          {body}
        </p>
        <div>
          <ViewLink
            href={
              inPlan
                ? routes.projectPlan(projectId)
                : routes.projectFraming(projectId)
            }
            className={buttonVariants({ variant: "outline" })}
          >
            <ButtonRoll>
              {inPlan ? t.locked.openPlan : t.locked.open}
            </ButtonRoll>
          </ViewLink>
        </div>
      </ContentCard>
    </div>
  );
}
