import { PageSection } from "@/components/shell/page-section";
import { FactList } from "@/components/ui/fact-list";
import { StatusBadge } from "@/components/ui/status-badge";
import { ToneCallout } from "@/components/ui/tone-callout";
import { fr } from "@/lib/i18n/fr";
import type { ReadinessCheck } from "@/lib/production/preprod/types";
import type { SheetLogistics } from "@/lib/production/sheet";
import { formatDate } from "@/lib/release/format";
import { locationStatusTone } from "@/lib/ui/state-tones";

import { LocationEditButton } from "./location-form";

const t = fr.productionPreprod.location;

/** « Lieu »: the place kept on the sheet (its state, what is known of it),
 * then the candidates compared before it (PROD-011 to PROD-013). */
export function LocationSection({
  projectId,
  sheetId,
  logistics,
  derogation = null,
  canOrganize,
  children,
}: {
  projectId: string;
  sheetId: string;
  logistics: SheetLogistics;
  // The « Lieu » readiness check's derogation, if any (BUG-003).
  derogation?: ReadinessCheck["derogation"];
  canOrganize: boolean;
  // The candidates' board.
  children?: React.ReactNode;
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
        {derogation && logistics.locationStatus !== "confirmed" && (
          <ToneCallout tone="warning">
            {t.derogated(
              derogation.by ?? "—",
              formatDate(derogation.at),
              derogation.reason,
            )}
          </ToneCallout>
        )}
        <FactList
          emptyLabel={fr.productionPreprod.notFilled}
          facts={[
            { label: t.fields.name, value: logistics.locationName },
            { label: t.fields.address, value: logistics.locationAddress },
            { label: t.fields.access, value: logistics.locationAccess },
            { label: t.fields.notes, value: logistics.locationNotes },
          ]}
        />
        {children}
      </div>
    </PageSection>
  );
}
