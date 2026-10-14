import { EmptyNote } from "@/components/shell/empty-state";
import { PageSection } from "@/components/shell/page-section";
import { FactList } from "@/components/ui/fact-list";
import { fr } from "@/lib/i18n/fr";
import type { CallSheetDefaults } from "@/lib/production/preprod/call-sheet-defaults";
import { isConfirmedEquipment } from "@/lib/production/preprod/equipment";
import { teamMembers } from "@/lib/production/preprod/team";
import type { CallSheet, Equipment } from "@/lib/production/preprod/types";
import type {
  Holder,
  ProductionNeed,
  SheetLogistics,
} from "@/lib/production/sheet";
import { formatDate } from "@/lib/release/format";

import { CallSheetEditButton } from "./call-sheet-form";

const t = fr.productionPreprod.callSheet;

type Details = Record<string, { phone: string | null; email: string | null }>;

/**
 * « Feuille de service »: date, call time, place and access; the team (from
 * the assignments, with the Réseau's phone and e-mail) and the confirmed
 * equipment read from their lists, never copied; then its own sections.
 */
export function CallSheetSection({
  projectId,
  sheetId,
  callSheet,
  shootDate,
  logistics,
  director,
  needs,
  equipment,
  details,
  canOrganize,
  proposed,
  children,
}: {
  projectId: string;
  sheetId: string;
  callSheet: CallSheet | null;
  shootDate: string | null;
  logistics: SheetLogistics;
  director: Holder | null;
  needs: ProductionNeed[];
  equipment: Equipment[];
  details: Details;
  canOrganize: boolean;
  // What its empty sections start from (brief, Fiche), PROD-003.
  proposed: CallSheetDefaults;
  // Its diffusion to the team (PROD-016).
  children?: React.ReactNode;
}) {
  const contactOf = (h: Holder) =>
    h.kind === "contact"
      ? [details[h.id]?.phone, details[h.id]?.email].filter(Boolean).join(" · ")
      : "";
  const team = [
    ...(director
      ? [{ holder: director, role: fr.productionPreprod.call.directorRole }]
      : []),
    ...teamMembers(needs),
  ];
  const confirmed = equipment.filter(
    (e) => isConfirmedEquipment(e) && e.status !== "returned",
  );
  const own = (key: Exclude<keyof CallSheet, "updatedBy" | "updatedAt">) => ({
    label: t.fields[key],
    value: callSheet?.[key] ?? null,
    valueClassName: "whitespace-pre-line",
  });

  return (
    <PageSection
      id="call-sheet"
      title={t.title}
      description={t.description}
      action={
        canOrganize ? (
          <CallSheetEditButton
            projectId={projectId}
            sheetId={sheetId}
            callSheet={callSheet}
            proposed={proposed}
          />
        ) : undefined
      }
      card
    >
      <div className="flex flex-col gap-8">
        <FactList
          emptyLabel={fr.productionPreprod.notFilled}
          facts={[
            { label: t.shoot, value: shootDate ? formatDate(shootDate) : null },
            own("callTime"),
            {
              label: t.location,
              value:
                [logistics.locationName, logistics.locationAddress]
                  .filter(Boolean)
                  .join(", ") || null,
            },
            { label: t.access, value: logistics.locationAccess },
          ]}
        />
        <section
          aria-labelledby="call-sheet-team"
          className="flex flex-col gap-3"
        >
          <h3 id="call-sheet-team" className="text-base font-semibold">
            {t.team}
          </h3>
          {team.length ? (
            <ul className="flex flex-col gap-2 text-sm">
              {team.map((m, i) => (
                <li
                  key={`${m.holder.kind}:${m.holder.id}:${i}`}
                  className="flex flex-col"
                >
                  <span className="font-medium">{`${m.holder.name} · ${m.role}`}</span>
                  {contactOf(m.holder) && (
                    <span className="text-xs text-muted-foreground">
                      {contactOf(m.holder)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyNote>{t.noTeam}</EmptyNote>
          )}
        </section>
        <section
          aria-labelledby="call-sheet-equipment"
          className="flex flex-col gap-3"
        >
          <h3 id="call-sheet-equipment" className="text-base font-semibold">
            {t.equipment}
          </h3>
          {confirmed.length ? (
            <ul className="flex flex-col gap-1 text-sm">
              {confirmed.map((e) => (
                <li key={e.id}>
                  {e.quantity ? `${e.label} × ${e.quantity}` : e.label}
                  {e.supplierName ? ` · ${e.supplierName}` : ""}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyNote>{t.noEquipment}</EmptyNote>
          )}
        </section>
        <FactList
          emptyLabel={fr.productionPreprod.notFilled}
          facts={[
            own("schedule"),
            own("sequences"),
            own("instructions"),
            own("contactsNote"),
            own("emergencies"),
            own("documentsNote"),
          ]}
        />
        {callSheet?.updatedBy && callSheet.updatedAt && (
          <p className="text-xs text-muted-foreground">
            {t.updatedBy(callSheet.updatedBy, formatDate(callSheet.updatedAt))}
          </p>
        )}
        {children}
      </div>
    </PageSection>
  );
}
