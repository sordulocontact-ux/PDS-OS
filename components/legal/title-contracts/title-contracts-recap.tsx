import { TitleContractKinds } from "@/components/legal/title-contracts/title-contract-needs";
import { StepSection } from "@/components/shell/journey/step-section";
import { ViewLink } from "@/components/ui/view-link";
import { legalDemarches } from "@/lib/i18n/fr/legal-demarches";
import { legalTitlesOf } from "@/lib/legal/title-groups";
import {
  legalProjectTitles,
  loadTitleContractNeeds,
} from "@/lib/legal/title-contracts";
import { legalTitleContractsHref } from "@/lib/ui/legal-steps";

const fr = { legalDemarches };

/**
 * Above the contracts of the people, in the Plan d'action of a collective:
 * for each live title, its name and the contracts the Juridique confirmed
 * for it, or « À confirmer », each line opening the title's step where it
 * is done (the gesture lives there: one main action per screen). Nothing
 * for a project with no live title.
 */
export async function TitleContractsRecap({
  projectId,
  masterIds,
}: {
  projectId: string;
  masterIds: string[];
}) {
  const [projectTitles, needs] = await Promise.all([
    legalProjectTitles(projectId),
    loadTitleContractNeeds(projectId),
  ]);
  const titles = legalTitlesOf(projectTitles, masterIds).filter(
    (title) => !title.abandoned,
  );
  if (titles.length === 0) return null;
  return (
    <StepSection
      id="legal-title-contracts"
      title={fr.legalDemarches.titleContracts.recapTitle}
    >
      <ul className="-mx-2 flex flex-col gap-0.5">
        {titles.map((title) => (
          <li key={title.id}>
            <ViewLink
              href={legalTitleContractsHref(projectId, title.id)}
              className="flex flex-col gap-1.5 rounded-lg px-2 py-2.5 hover:bg-[var(--control-bg-hover)] sm:flex-row sm:items-center sm:justify-between sm:gap-3"
            >
              <span className="min-w-0 text-[length:var(--type-body-md)] leading-[var(--type-body-md-lh)] font-medium break-words">
                {title.label}
              </span>
              <TitleContractKinds
                needs={needs.get(title.id) ?? { confirmed: false, kinds: [] }}
              />
            </ViewLink>
          </li>
        ))}
      </ul>
    </StepSection>
  );
}
