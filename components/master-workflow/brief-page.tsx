import { BriefBudget } from "@/components/master-workflow/brief-budget";
import { BriefExchanges } from "@/components/master-workflow/brief-exchanges";
import { BriefForm } from "@/components/master-workflow/brief-form";
import { BriefHeader } from "@/components/master-workflow/brief-header";
import { BriefQuestions } from "@/components/master-workflow/brief-questions";
import { MasterFactAction } from "@/components/master-workflow/master-fact-action";
import { CallPrepForm } from "@/components/calls/prep/call-prep-form";
import { CallPrepLauncher } from "@/components/calls/prep/call-prep-launcher";
import { AddToNetworkButton } from "@/components/network/add-to-network-button";
import { EmptyNote } from "@/components/shell/empty-state";
import { PageSection } from "@/components/shell/page-section";
import { FactTable } from "@/components/ui/fact-table";
import { ToneCallout } from "@/components/ui/tone-callout";
import type { CallPrepDefaults } from "@/lib/calls/prep/types";
import { fr } from "@/lib/i18n/fr";
import type { BriefView } from "@/lib/master-workflow/brief-types";
import type { BriefQuestionsView } from "@/lib/master-workflow/question-types";
import { formatDateTime } from "@/lib/calls/format";

/**
 * The Brief Mix/Master of a project: the source of each title as the État
 * du master shows it (confirmed there, or right here by the owner), then the
 * exchanges held to fill it and the questions asked to the team, then its
 * form. The owner fills it by hand, by
 * dictation (header) or from an exchange's transcript; "Ajouter un
 * ingénieur" puts a missing engineer in the Réseau without leaving the page.
 */
export function BriefPage({
  view,
  questions,
  exchange,
}: {
  view: BriefView;
  // The common call form's defaults, for the owner only.
  exchange: CallPrepDefaults | null;
  questions: BriefQuestionsView;
}) {
  const t = fr.masterWorkflow.brief;
  return (
    <div className="grid gap-8">
      <BriefHeader
        projectId={view.projectId}
        canEdit={view.canEdit}
        actions={
          view.canAddContact && (
            <AddToNetworkButton
              header
              label={fr.masterWorkflow.inventory.network.add}
              action={{
                kind: "add_to_network",
                name: "",
                roles: ["engineer"],
                links: [],
              }}
            />
          )
        }
      />
      <div className="-mt-4 flex flex-col gap-1">
        <p className="text-body-md">{t.purpose}</p>
        <p className="text-caption text-[color:var(--text-secondary)]">
          {view.savedAt
            ? t.savedAt(formatDateTime(view.savedAt), view.savedBy)
            : t.notSaved}
        </p>
      </div>
      {view.allFinal && <ToneCallout tone="success">{t.allFinal}</ToneCallout>}

      <PageSection
        id="brief-sources"
        title={t.sections.sources.title}
        description={t.sections.sources.description}
        card
      >
        {view.sourcesFailed ? (
          <EmptyNote>{fr.facts.failed}</EmptyNote>
        ) : view.sources.length === 0 ? (
          <EmptyNote>{fr.facts.noMasters}</EmptyNote>
        ) : (
          <FactTable
            facts={view.sources}
            renderAction={(action) => (
              <MasterFactAction
                action={action}
                organizationId={view.organizationId}
              />
            )}
          />
        )}
      </PageSection>

      <PageSection
        id="brief-exchanges"
        title={t.exchanges.title}
        description={t.exchanges.description}
        card
        action={
          exchange && (
            <CallPrepLauncher
              label={t.exchanges.prepare}
              title={t.exchanges.prepareTitle}
              body={t.exchanges.prepareDescription}
              mode="sheet"
              variant="default"
            >
              <CallPrepForm defaults={exchange} />
            </CallPrepLauncher>
          )
        }
      >
        {view.exchanges.length === 0 ? (
          <EmptyNote>{t.exchanges.empty}</EmptyNote>
        ) : (
          <BriefExchanges
            projectId={view.projectId}
            exchanges={view.exchanges}
            canEdit={view.canEdit}
          />
        )}
      </PageSection>

      <BriefQuestions projectId={view.projectId} view={questions} />

      {/* Remounted on each save (an answer applied included): the fields
          start again from the saved brief. */}
      <BriefForm key={view.savedAt ?? "new"} view={view} />

      {view.canSeeBudget && (
        <PageSection
          id="brief-budget"
          title={t.budget.title}
          description={t.budget.description}
          card
        >
          <BriefBudget view={view} />
        </PageSection>
      )}
    </div>
  );
}
