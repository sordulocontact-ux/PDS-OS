import { PackagePreview } from "@/components/master-workflow/package-preview";
import { TransmissionHistory } from "@/components/master-workflow/transmission-history";
import {
  TransmitButton,
  type TransmitMode,
} from "@/components/master-workflow/transmit-button";
import { EmptyNote } from "@/components/shell/empty-state";
import { PageSection } from "@/components/shell/page-section";
import { fr } from "@/lib/i18n/fr";
import type { StepView } from "@/lib/master-workflow/transmission";

/**
 * The package of a step (Mix or Mastering), shown exactly as it will be
 * sent, then the follow-up of each sending. Only the project's owner sends
 * ("Transmettre", then "Relancer" while unanswered, "Renvoyer le dossier"
 * once received: a new source, final stems, an expired link); anyone who
 * sees the project follows.
 */
export function PackageSections({ view }: { view: StepView }) {
  const t = fr.masterWorkflow.mix;
  const latest = view.history[0];
  const ready = view.canEdit && view.blockers.length === 0;
  const button = (mode: TransmitMode) => (
    <TransmitButton view={view} mode={mode} />
  );
  return (
    <>
      <PageSection
        id={`${view.role}-package`}
        title={t.package.title[view.role]}
        description={t.package.description}
        card
        // A first sending here; afterwards, "Relancer" in the follow-up.
        action={ready && !latest && button("first")}
        // Once sent, what the engineer received folds away: the follow-up
        // and the versions come first.
        collapsible={latest !== undefined}
        defaultOpen={latest === undefined}
      >
        <PackagePreview view={view} />
      </PageSection>

      <PageSection
        id={`${view.role}-history`}
        title={t.history.title}
        description={t.history.description}
        card
        action={
          ready && latest && button(latest.acknowledgedAt ? "resend" : "remind")
        }
      >
        {view.history.length === 0 ? (
          <EmptyNote>{t.history.empty}</EmptyNote>
        ) : (
          <TransmissionHistory
            rows={view.history}
            role={view.role}
            projectId={view.projectId}
            canEdit={view.canEdit}
          />
        )}
      </PageSection>
    </>
  );
}
