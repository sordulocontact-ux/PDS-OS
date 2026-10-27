import { ContentCard } from "@/components/shell/content-card";
import { buttonVariants } from "@/components/ui/button";
import { InfoRow, Rows } from "@/components/ui/rows";
import { StatusBadge } from "@/components/ui/status-badge";
import { ViewLink } from "@/components/ui/view-link";
import { routes } from "@/lib/auth/redirects";
import { projectShell } from "@/lib/i18n/fr/project-shell";
import type { JourneyStep } from "@/lib/ui/journey";

const fr = { projectShell };

/**
 * « Avant les workflows » (proto « Projet complet »): before « Lancer le
 * plan », the order the project follows and where the Cadrage's steps stand
 * — Fait, En cours, À venir — then « Ouvrir le Cadrage ».
 */
export function BeforeWorkflows({
  projectId,
  steps,
}: {
  projectId: string;
  steps: JourneyStep[];
}) {
  const t = fr.projectShell.overview.before;
  return (
    <ContentCard title={t.title}>
      <p className="text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)] text-[color:var(--text-secondary)]">
        {t.body}
      </p>
      <Rows>
        {steps.map((step) => {
          const state =
            step.status === "done"
              ? "done"
              : step.status === "current" ||
                  step.status === "waiting" ||
                  step.status === "rework"
                ? "current"
                : "later";
          return (
            <InfoRow
              key={step.key}
              title={step.title}
              detail={t.sub[state]}
              badge={
                <StatusBadge
                  tone={
                    state === "done"
                      ? "success"
                      : state === "current"
                        ? "info"
                        : "neutral"
                  }
                >
                  {t.badge[state]}
                </StatusBadge>
              }
            />
          );
        })}
      </Rows>
      <div>
        <ViewLink
          href={routes.projectFraming(projectId)}
          className={buttonVariants({ variant: "outline" })}
        >
          {t.open}
        </ViewLink>
      </div>
    </ContentCard>
  );
}
