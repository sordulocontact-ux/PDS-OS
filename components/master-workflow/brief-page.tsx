import { BriefForm } from "@/components/master-workflow/brief-form";
import { MasterFactAction } from "@/components/master-workflow/master-fact-action";
import { AddToNetworkButton } from "@/components/network/add-to-network-button";
import { ProjectPageHeader } from "@/components/projects/project-page-header";
import { EmptyNote } from "@/components/shell/empty-state";
import { PageSection } from "@/components/shell/page-section";
import { FactTable } from "@/components/ui/fact-table";
import { fr } from "@/lib/i18n/fr";
import type { BriefView } from "@/lib/master-workflow/brief-types";
import { formatShortDate } from "@/lib/release/format";

/**
 * The Brief Mix/Master of a project: the source of each title as the État
 * du master shows it (confirmed there, or right here by the owner), then the
 * form of the brief. "Ajouter un ingénieur" puts a missing engineer in the
 * Réseau without leaving the page: the menus list them at once.
 */
export function BriefPage({ view }: { view: BriefView }) {
  const t = fr.masterWorkflow.brief;
  return (
    <div className="grid gap-8">
      <ProjectPageHeader
        title={t.title}
        description={t.description}
        action={
          view.canEdit &&
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
      <p className="-mt-4 text-caption text-[color:var(--text-secondary)]">
        {view.savedAt
          ? t.saved(formatShortDate(view.savedAt), view.savedBy)
          : t.notSaved}
      </p>

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

      <BriefForm view={view} />
    </div>
  );
}
