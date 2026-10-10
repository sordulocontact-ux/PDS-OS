import { PageSection } from "@/components/shell/page-section";
import type { Member } from "@/lib/framing/related";
import { fr } from "@/lib/i18n/fr";
import type { ProductionBriefChoices } from "@/lib/production/brief";
import { NEED_FAMILIES, suggestNeeds } from "@/lib/production/roles";
import type {
  Holder,
  NetworkOption,
  ProductionNeed,
} from "@/lib/production/sheet";

import { NeedFamilyBlock } from "./need-family-block";

/**
 * « Équipes » (ticket, parcours 3): one block per family, in NEED_FAMILIES'
 * order, never image and sound together. PO suggests positions from the
 * brief's choices (code, suggestNeeds) and known profiles; the owner
 * confirms the need, the number of people, who holds it and their
 * availability. Read only without `canOrganize`.
 */
export function ProductionNeedsSection({
  projectId,
  sheetId,
  needs,
  director,
  choices,
  canOrganize,
  members,
  contacts,
}: {
  projectId: string;
  sheetId: string;
  needs: ProductionNeed[];
  director: Holder | null;
  choices: ProductionBriefChoices;
  canOrganize: boolean;
  members: Member[];
  contacts: NetworkOption[];
}) {
  const t = fr.productionNeeds;
  const suggestions = canOrganize
    ? suggestNeeds(
        choices,
        needs.map((n) => ({ family: n.family, roleKey: n.roleKey })),
      )
    : [];
  return (
    <PageSection
      id="production-needs"
      title={t.title}
      description={t.description}
      card
    >
      <div className="flex flex-col gap-8">
        {NEED_FAMILIES.map((family) => (
          <NeedFamilyBlock
            key={family}
            projectId={projectId}
            sheetId={sheetId}
            family={family}
            needs={needs.filter((n) => n.family === family)}
            suggestions={suggestions.filter((s) => s.family === family)}
            director={director}
            canOrganize={canOrganize}
            members={members}
            contacts={contacts}
          />
        ))}
      </div>
    </PageSection>
  );
}
