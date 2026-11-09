import { ContentCard } from "@/components/shell/content-card";
import { InfoRow, Rows } from "@/components/ui/rows";
import { StatusBadge } from "@/components/ui/status-badge";
import { journey } from "@/lib/i18n/fr/journey";
import { projectShell } from "@/lib/i18n/fr/project-shell";
import { type JourneyStep, prereqsOf, withModule } from "@/lib/ui/journey";

const fr = { journey, projectShell };

/**
 * « Avant les workflows » (proto « Projet complet »): before « Lancer le
 * plan », the order the project follows and where the Cadrage's steps stand
 * — Fait, En cours, À venir, a step to come naming the one it waits for
 * (« Après : Brief de cadrage », as the journey says it). Each row opens
 * its step, locked ones too (read-only, as the spine does). « Maintenant »
 * above already opens the Cadrage (Figma PDS OS 304:20801, Sacha 29/10).
 */
export function BeforeWorkflows({ steps }: { steps: JourneyStep[] }) {
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
          const waitsFor = prereqsOf(step, steps)
            .filter((p) => !p.done)
            .map(withModule);
          return (
            <InfoRow
              key={step.key}
              href={step.href}
              title={step.title}
              detail={
                state === "later" && waitsFor.length > 0
                  ? fr.journey.after(waitsFor.join(", "))
                  : t.sub[state]
              }
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
    </ContentCard>
  );
}
