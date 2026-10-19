import { IconLock } from "nucleo-sharp-essential";

import { ProjectHeader } from "@/components/projects/project-header";
import { ContentCard } from "@/components/shell/content-card";
import { buttonVariants } from "@/components/ui/button";
import { ViewLink } from "@/components/ui/view-link";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";

/**
 * A workflow before « Lancer le plan » (proto « Projet complet », `locked()`):
 * its head with « Non démarré », then one card that says when it starts and
 * leads to the Cadrage, where the plan is built and launched. The same for
 * the Master, the Juridique, the Marketing and the Distribution.
 */
export function WorkflowLocked({
  projectId,
  title,
}: {
  projectId: string;
  // The workflow's name when the URL names a part of it (the Marketing's
  // Stratégie).
  title?: string;
}) {
  const t = fr.projectShell;
  return (
    <div className="flex flex-col gap-5">
      <ProjectHeader
        projectId={projectId}
        title={title}
        status={{ label: t.status.notStarted, tone: "neutral" }}
      />
      <ContentCard label={t.locked.body}>
        <p className="flex items-start gap-2.5 text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)]">
          <IconLock aria-hidden className="mt-0.5 size-3.5 shrink-0" />
          {t.locked.body}
        </p>
        <div>
          <ViewLink
            href={routes.projectFraming(projectId)}
            className={buttonVariants({ variant: "outline" })}
          >
            {t.locked.open}
          </ViewLink>
        </div>
      </ContentCard>
    </div>
  );
}
