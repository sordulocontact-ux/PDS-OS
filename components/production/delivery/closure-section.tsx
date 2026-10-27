import { PageSection } from "@/components/shell/page-section";
import { buttonVariants } from "@/components/ui/button";
import { FactList } from "@/components/ui/fact-list";
import { ToneCallout } from "@/components/ui/tone-callout";
import { ViewLink } from "@/components/ui/view-link";
import { routes } from "@/lib/auth/redirects";
import { productionClosure } from "@/lib/i18n/fr/production-closure";
import type { ClosureFacts } from "@/lib/production/delivery/closure-queries";
import type { DeliveryTabData } from "@/lib/production/delivery/queries";
import {
  handoffStaleness,
  type ChecklistSummary,
} from "@/lib/production/delivery/rules";
import { formatDate } from "@/lib/release/format";

import { CloseProductionButton } from "./close-production-button";

const fr = { productionClosure };

const t = fr.productionClosure.closure;

/**
 * Clôture (PROD-040): what the Production delivered and transmitted, what
 * is still open (it prevents a false closing, the database refuses it on
 * the same rules), « Clôturer » for the owner, then the way to the
 * follow-up in Activations. A closed production stays readable.
 */
export function ClosureSection({
  projectId,
  sheetId,
  title,
  data,
  summary,
  facts,
  closed,
  canOrganize,
}: {
  projectId: string;
  sheetId: string;
  title: string;
  data: DeliveryTabData;
  summary: ChecklistSummary;
  facts: ClosureFacts;
  closed: { at: string; by: string | null } | null;
  canOrganize: boolean;
}) {
  const { delivery, handoffs } = data;
  const [latest] = handoffs;
  const stale = latest ? handoffStaleness(latest, delivery) !== null : false;
  const open = [
    !latest && t.open.notHandedOff,
    stale && t.open.staleHandoff,
    facts.equipmentOut > 0 && t.open.equipment(facts.equipmentOut),
    facts.blockingIncidents > 0 && t.open.incidents(facts.blockingIncidents),
  ].filter((item): item is string => Boolean(item));
  const done = (who: string | null, at: string | null) =>
    at ? t.recap.done(who, formatDate(at)) : t.recap.notYet;
  const activationHref = facts.activationId
    ? routes.projectActivation(projectId, facts.activationId)
    : `${routes.projectActivations(projectId)}#attach`;

  return (
    <PageSection id="closure" title={t.title} description={t.description}>
      <div className="flex flex-col gap-4">
        {closed && (
          <ToneCallout tone="success">
            {t.closed(closed.by, formatDate(closed.at))}
          </ToneCallout>
        )}
        <FactList
          facts={[
            { label: t.recap.deliverable, value: title },
            {
              label: t.recap.creative,
              value: done(
                delivery?.approvedBy ?? null,
                delivery?.approvedAt ?? null,
              ),
            },
            {
              label: t.recap.technical,
              value: done(
                delivery?.checkedBy ?? null,
                delivery?.checkedAt ?? null,
              ),
            },
            {
              label: t.recap.delivery,
              value: done(
                delivery?.deliveredBy ?? null,
                delivery?.deliveredAt ?? null,
              ),
            },
            {
              label: t.recap.exports,
              value: t.recap.exportsValue(summary.ok, summary.total),
            },
            {
              label: t.recap.handoffs,
              value: latest
                ? t.recap.handoffsValue(handoffs.length, latest.recipient)
                : t.recap.notYet,
            },
          ]}
        />
        {!closed && open.length > 0 && (
          <ToneCallout tone="warning" as="div">
            <p className="font-medium">{t.openTitle}</p>
            <ul className="mt-1 list-disc pl-5">
              {open.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </ToneCallout>
        )}
        <div className="flex flex-wrap items-center gap-3">
          {!closed && canOrganize && open.length === 0 && (
            <CloseProductionButton
              projectId={projectId}
              sheetId={sheetId}
              title={title}
            />
          )}
          {latest && (
            <ViewLink
              href={activationHref}
              className={buttonVariants({
                variant: closed ? "default" : "outline",
                size: "sm",
              })}
            >
              {facts.activationId ? t.activation : t.activations}
            </ViewLink>
          )}
        </div>
      </div>
    </PageSection>
  );
}
