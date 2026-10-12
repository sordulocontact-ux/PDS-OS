import { DeclareMixFinalButton } from "@/components/master-workflow/declare-mix-final-button";
import { PageSection } from "@/components/shell/page-section";
import { StatusBadge } from "@/components/ui/status-badge";
import { fr } from "@/lib/i18n/fr";
import type { StepView } from "@/lib/master-workflow/transmission";
import type { Tone } from "@/lib/ui/state-tones";

const TONE: Record<StepView["diagnosis"][number]["state"], Tone> = {
  todo: "neutral",
  running: "info",
  done: "success",
  master_final: "success",
};

/**
 * Where each title stands for its mix, before anything else (PROJ-BUG-06):
 * mix to do, mix running, mix done, master final already. A title whose mix
 * is already in the Catalogue goes straight to the mastering, once its
 * owner says that file is the Mix final; nothing asks to mix it again.
 */
export function MixDiagnosis({ view }: { view: StepView }) {
  const t = fr.masterWorkflow.diagnosis;
  if (view.diagnosis.length === 0) return null;
  return (
    <PageSection
      id="mix-diagnosis"
      title={t.title}
      description={t.description}
      card
    >
      <ul className="flex flex-col gap-4">
        {view.diagnosis.map((row) => (
          <li
            key={row.id}
            className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"
          >
            <div className="grid min-w-0 gap-0.5">
              <p className="font-medium break-words">{row.title}</p>
              <p className="text-sm text-muted-foreground">
                {row.existingMix
                  ? t.existing(row.existingMix.fileName)
                  : t.next[row.state]}
              </p>
              {row.divergence && (
                <p className="text-sm text-[color:var(--tone-warning-fg)]">
                  {t.divergence(row.divergence.brief, row.divergence.catalogue)}
                </p>
              )}
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <StatusBadge tone={TONE[row.state]} size="sm">
                {t.states[row.state]}
              </StatusBadge>
              {row.existingMix && view.canEdit && (
                <DeclareMixFinalButton
                  projectId={view.projectId}
                  masterId={row.id}
                  file={row.existingMix}
                  title={row.title}
                />
              )}
            </div>
          </li>
        ))}
      </ul>
    </PageSection>
  );
}
