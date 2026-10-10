import { EmptyNote } from "@/components/shell/empty-state";
import { PageSection } from "@/components/shell/page-section";
import { ToneCallout } from "@/components/ui/tone-callout";
import { fr } from "@/lib/i18n/fr";
import type { Member } from "@/lib/framing/related";
import type { ProductionBrief } from "@/lib/production/brief";
import { duplicatePairs } from "@/lib/production/preprod/equipment";
import type { PreprodData } from "@/lib/production/preprod/types";
import type { NetworkOption } from "@/lib/production/sheet";
import { formatShortDate } from "@/lib/release/format";

import { AddEquipmentButton, MergeButton } from "./equipment-actions";
import { EquipmentTable } from "./equipment-table";
import { QuoteFiles } from "./quote-files";

const t = fr.productionPreprod.equipment;
const choices = fr.productionBrief.choices;

/**
 * « Matériel et devis » (MVP): the brief's needs as a reminder, possible
 * duplicates to merge (never removed silently), the manual list, then the
 * quotes and captures kept as sources.
 */
export function EquipmentSection({
  organizationId,
  projectId,
  sheetId,
  preprod,
  brief,
  today,
  members,
  contacts,
  canOrganize,
}: {
  organizationId: string | null;
  projectId: string;
  sheetId: string;
  preprod: Pick<PreprodData, "equipment" | "quotes">;
  brief: ProductionBrief;
  today: string;
  members: Member[];
  contacts: NetworkOption[];
  canOrganize: boolean;
}) {
  const common = { projectId, sheetId, members, contacts };
  const needs: string[] = [];
  if (brief.cameraSetup)
    needs.push(choices.cameraSetup[brief.cameraSetup].label);
  if (brief.soundCapture)
    needs.push(choices.soundCapture[brief.soundCapture].label);
  const pairs = duplicatePairs(preprod.equipment);
  const linesByFile: Record<string, number> = {};
  for (const e of preprod.equipment)
    if (e.quoteFileId)
      linesByFile[e.quoteFileId] = (linesByFile[e.quoteFileId] ?? 0) + 1;

  return (
    <PageSection
      id="equipment"
      title={t.title}
      description={t.description}
      action={canOrganize ? <AddEquipmentButton {...common} /> : undefined}
      card
    >
      <div className="flex flex-col gap-8">
        {needs.length > 0 && (
          <p className="text-sm text-muted-foreground">
            {t.briefNeeds(needs.join(" · "))}
          </p>
        )}
        {pairs.length > 0 && (
          <section
            aria-labelledby="equipment-duplicates"
            className="flex flex-col gap-2"
          >
            <h3 id="equipment-duplicates" className="text-base font-semibold">
              {t.duplicates}
            </h3>
            {pairs.map(({ keep, other }) => (
              <div
                key={`${keep.id}-${other.id}`}
                className="flex flex-wrap items-center gap-2"
              >
                <ToneCallout tone="warning" className="flex-1">
                  {t.duplicate(keep.label, other.label)}
                </ToneCallout>
                {canOrganize && (
                  <MergeButton
                    projectId={projectId}
                    keep={{ id: keep.id, label: keep.label }}
                    other={{ id: other.id, label: other.label }}
                  />
                )}
              </div>
            ))}
          </section>
        )}
        {preprod.equipment.length ? (
          <EquipmentTable
            {...common}
            equipment={preprod.equipment}
            quotes={preprod.quotes}
            today={today}
            canOrganize={canOrganize}
          />
        ) : (
          <EmptyNote>{t.empty}</EmptyNote>
        )}
        <section
          aria-labelledby="equipment-quotes"
          className="flex flex-col gap-3"
        >
          <h3 id="equipment-quotes" className="text-base font-semibold">
            {t.quotes}
          </h3>
          <QuoteFiles
            {...common}
            organizationId={organizationId}
            files={preprod.quotes}
            linesByFile={linesByFile}
            dates={Object.fromEntries(
              preprod.quotes.map((f) => [f.id, formatShortDate(f.createdAt)]),
            )}
            canOrganize={canOrganize}
          />
        </section>
      </div>
    </PageSection>
  );
}
