import { EmptyNote } from "@/components/shell/empty-state";
import type { Member } from "@/lib/framing/related";
import { fr } from "@/lib/i18n/fr";
import type { NeedFamily, NeedSuggestion } from "@/lib/production/roles";
import type {
  Holder,
  NetworkOption,
  ProductionNeed,
} from "@/lib/production/sheet";

import { NeedAddControls } from "./need-add-controls";
import { NeedCard, needRowClass } from "./need-card";

const t = fr.productionNeeds;

/**
 * One family of the needs (Réalisation, Équipe image…): its positions, PO's
 * suggestions and « Ajouter un poste » for the owner. Réalisation opens with
 * the director designated on the brief, read only here.
 */
export function NeedFamilyBlock({
  projectId,
  sheetId,
  family,
  needs,
  suggestions,
  director,
  canOrganize,
  members,
  contacts,
}: {
  projectId: string;
  sheetId: string;
  family: NeedFamily;
  needs: ProductionNeed[];
  suggestions: NeedSuggestion[];
  director: Holder | null;
  canOrganize: boolean;
  members: Member[];
  contacts: NetworkOption[];
}) {
  const titleId = `production-needs-${family}-title`;
  const heading = (
    <h3 id={titleId} className="font-medium">
      {t.families[family]}
    </h3>
  );
  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-3">
      {canOrganize ? (
        <NeedAddControls
          projectId={projectId}
          sheetId={sheetId}
          family={family}
          heading={heading}
          suggestions={suggestions}
        />
      ) : (
        heading
      )}
      {family === "direction" && (
        <div className={needRowClass}>
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="font-medium">{t.director.label}</span>
            <span className="text-sm text-muted-foreground">
              {director
                ? `${director.name} · ${t.director.fromBrief}`
                : t.director.missing}
            </span>
          </div>
        </div>
      )}
      {needs.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {needs.map((need) => (
            <NeedCard
              key={need.id}
              projectId={projectId}
              sheetId={sheetId}
              need={need}
              canOrganize={canOrganize}
              members={members}
              contacts={contacts}
            />
          ))}
        </ul>
      ) : (
        <EmptyNote>
          {canOrganize ? t.empty.organize : t.empty.readOnly}
        </EmptyNote>
      )}
    </section>
  );
}
