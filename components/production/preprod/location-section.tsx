import { PageSection } from "@/components/shell/page-section";
import { FactList } from "@/components/ui/fact-list";
import { StatusBadge } from "@/components/ui/status-badge";
import { fr } from "@/lib/i18n/fr";
import type { SheetLogistics } from "@/lib/production/sheet";
import { locationStatusTone } from "@/lib/ui/state-tones";

import { LocationEditButton } from "./location-form";

const t = fr.productionPreprod.location;

/** « Lieu »: its state, then what is known of it. */
export function LocationSection({
  projectId,
  sheetId,
  logistics,
  canOrganize,
}: {
  projectId: string;
  sheetId: string;
  logistics: SheetLogistics;
  canOrganize: boolean;
}) {
  return (
    <PageSection
      id="location"
      title={t.title}
      description={t.description}
      action={
        canOrganize ? (
          <LocationEditButton
            projectId={projectId}
            sheetId={sheetId}
            logistics={logistics}
          />
        ) : undefined
      }
      card
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge tone={locationStatusTone[logistics.locationStatus]}>
            {t.statuses[logistics.locationStatus]}
          </StatusBadge>
          <span className="text-sm text-muted-foreground">
            {t.statusHints[logistics.locationStatus]}
          </span>
        </div>
        <FactList
          emptyLabel={fr.productionPreprod.notFilled}
          facts={[
            { label: t.fields.name, value: logistics.locationName },
            { label: t.fields.address, value: logistics.locationAddress },
            { label: t.fields.access, value: logistics.locationAccess },
            { label: t.fields.notes, value: logistics.locationNotes },
          ]}
        />
      </div>
    </PageSection>
  );
}
