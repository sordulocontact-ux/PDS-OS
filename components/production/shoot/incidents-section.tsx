import { FactRow, FactRows } from "@/components/ui/fact-row";
import { Rows } from "@/components/ui/rows";
import { EmptyNote } from "@/components/shell/empty-state";
import { StepSection } from "@/components/shell/journey/step-section";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDateTime } from "@/lib/calls/format";
import type { Member } from "@/lib/framing/related";
import { productionShoot } from "@/lib/i18n/fr/production-shoot";
import type { ShootIncident } from "@/lib/production/shoot/rules";
import type { NetworkOption } from "@/lib/production/sheet";
import { shootIncidentTone } from "@/lib/ui/state-tones";

import { IncidentActions } from "./incident-actions";
import { IncidentAddButton } from "./incident-add-button";

const fr = { productionShoot };

const t = fr.productionShoot.incidents;

/** Parcours 11 and 12: the incidents, their impact, who follows them, and
 * what they block — a person's choice. An incident without a blocker is
 * followed without blocking anything. */
export function IncidentsSection({
  projectId,
  sheetId,
  incidents,
  members,
  contacts,
  canOrganize,
}: {
  projectId: string;
  sheetId: string;
  incidents: ShootIncident[];
  members: Member[];
  contacts: NetworkOption[];
  canOrganize: boolean;
}) {
  return (
    <StepSection
      id="shoot-incidents"
      title={t.title}
      description={t.description}
      aside={
        canOrganize && (
          <IncidentAddButton
            projectId={projectId}
            sheetId={sheetId}
            members={members}
            contacts={contacts}
          />
        )
      }
    >
      {incidents.length === 0 ? (
        <EmptyNote>{t.empty}</EmptyNote>
      ) : (
        <Rows>
          {incidents.map((incident) => (
            <IncidentItem
              key={incident.id}
              incident={incident}
              actions={
                canOrganize && (
                  <IncidentActions
                    projectId={projectId}
                    sheetId={sheetId}
                    incident={incident}
                    members={members}
                    contacts={contacts}
                  />
                )
              }
            />
          ))}
        </Rows>
      )}
    </StepSection>
  );
}

function IncidentItem({
  incident: i,
  actions,
}: {
  incident: ShootIncident;
  actions: React.ReactNode;
}) {
  const resolved = i.resolvedAt !== null;
  const details = [
    { label: t.impact, value: i.impact },
    { label: t.holder, value: i.holder?.name ?? null },
    { label: t.followUp, value: i.followUp },
    { label: t.resolution, value: i.resolution },
  ].filter((d) => d.value !== null);
  return (
    <li className="flex flex-col gap-3 px-4 py-3.5 modern:py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-2">
          <span className="text-sm font-semibold break-words">{i.title}</span>
          <div className="flex flex-wrap gap-1.5">
            <StatusBadge size="sm" tone="neutral">
              {fr.productionShoot.incidents.categories[i.category]}
            </StatusBadge>
            {i.impacts.length === 0 ? (
              <StatusBadge size="sm" tone="neutral">
                {fr.productionShoot.incidents.plainFact}
              </StatusBadge>
            ) : (
              i.impacts.map((x) => (
                <StatusBadge key={x} size="sm" tone="warning">
                  {fr.productionShoot.incidents.impacts[x]}
                </StatusBadge>
              ))
            )}
            <StatusBadge
              size="sm"
              tone={shootIncidentTone[resolved ? "resolved" : "open"]}
            >
              {resolved ? t.resolved : t.open}
            </StatusBadge>
            {i.blocksClosing && !resolved && (
              <StatusBadge size="sm" tone="danger">
                {t.blocksClosing}
              </StatusBadge>
            )}
            {i.blocksPost && !resolved && (
              <StatusBadge size="sm" tone="danger">
                {t.blocksPost}
              </StatusBadge>
            )}
            {!i.blocksClosing && !i.blocksPost && !resolved && (
              <StatusBadge size="sm" tone="neutral">
                {t.noBlock}
              </StatusBadge>
            )}
          </div>
        </div>
        {actions}
      </div>
      {details.length > 0 && (
        <FactRows>
          {details.map((d) => (
            <FactRow
              key={d.label}
              label={d.label}
              value={
                <span className="break-words whitespace-pre-line">
                  {d.value}
                </span>
              }
            />
          ))}
        </FactRows>
      )}
      {resolved && i.resolvedAt && (
        <p className="text-xs text-muted-foreground">
          {t.resolvedBy(i.resolvedBy ?? "—", formatDateTime(i.resolvedAt))}
        </p>
      )}
    </li>
  );
}
