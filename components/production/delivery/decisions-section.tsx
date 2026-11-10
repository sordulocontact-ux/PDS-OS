import { Rows } from "@/components/ui/rows";
import { DeliveryStepButton } from "@/components/production/delivery-step-button";
import { FinalFileButton } from "@/components/production/final-file-button";
import { StepSection } from "@/components/shell/journey/step-section";
import { buttonVariants, ButtonRoll } from "@/components/ui/button";
import { ViewLink } from "@/components/ui/view-link";
import { routes } from "@/lib/auth/redirects";
import { productionDelivery } from "@/lib/i18n/fr/production-delivery";
import { productionLight } from "@/lib/i18n/fr/production-light";
import type { DeliveryTabData } from "@/lib/production/delivery/queries";
import type { Decision, DecisionReason } from "@/lib/production/delivery/rules";
import { formatDate } from "@/lib/release/format";

import { DecisionCard } from "./decision-card";

const fr = { productionDelivery, productionLight };

const t = fr.productionDelivery.decisions;

function reasonText(reason: DecisionReason): string {
  switch (reason.key) {
    case "to_check":
    case "not_ok":
    case "stale":
      return t.reasons[reason.key](reason.count);
    default:
      return t.reasons[reason.key];
  }
}

const texts = (decision: Decision) => decision.reasons.map(reasonText);

/**
 * Validation créative, contrôle technique, livraison (ticket § 20): three
 * distinct decisions in their order, with who took each and when, or why
 * it cannot be taken yet. The creative one is given on a version, in the
 * Postproduction tab.
 */
export function DecisionsSection({
  projectId,
  deliverable,
  data,
  decisions,
  canOrganize,
  deliver,
  recipients = [],
}: {
  projectId: string;
  deliverable: { id: string; title: string };
  data: DeliveryTabData;
  decisions: { creative: Decision; technical: Decision; delivery: Decision };
  canOrganize: boolean;
  // « Destinataires de la livraison » and « Confirmer la livraison »
  // (proto recipientsPick), for the project's owner, under the three.
  deliver?: React.ReactNode;
  // The last delivery's recipients (« Livré à … »).
  recipients?: string[];
}) {
  const { delivery: d, version } = data;
  const { creative, technical, delivery } = decisions;
  const step = (key: "check" | "deliver" | "reopen") => (
    <DeliveryStepButton
      projectId={projectId}
      deliverableId={deliverable.id}
      title={deliverable.title}
      step={key}
      onVersion
    />
  );

  return (
    <StepSection id="decisions" title={t.title} description={t.description}>
      <Rows>
        <DecisionCard
          number={1}
          title={t.creative.title}
          state={creative.state}
          reasons={[]}
          summary={
            d?.approvedAt
              ? version
                ? t.creative.done(
                    version.number,
                    d.approvedBy ?? "—",
                    formatDate(d.approvedAt),
                  )
                : t.creative.doneWithoutVersion(
                    d.approvedBy ?? "—",
                    formatDate(d.approvedAt),
                  )
              : t.creative.pending
          }
        >
          <ViewLink
            href={routes.projectProductionStep(
              projectId,
              deliverable.id,
              "post",
            )}
            className={buttonVariants({ size: "sm", variant: "outline" })}
          >
            <ButtonRoll>{t.creative.open}</ButtonRoll>
          </ViewLink>
          {d?.approvedAt && version?.href && (
            <a
              href={version.href}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ size: "sm", variant: "ghost" })}
            >
              <ButtonRoll>{t.creative.openVersion}</ButtonRoll>
            </a>
          )}
        </DecisionCard>

        <DecisionCard
          number={2}
          title={t.technical.title}
          state={technical.state}
          reasons={texts(technical)}
          summary={
            d?.checkedAt
              ? t.technical.done(d.checkedBy ?? "—", formatDate(d.checkedAt))
              : technical.reasons.length === 0
                ? t.technical.ready
                : null
          }
        >
          {canOrganize &&
            technical.state === "to_do" &&
            technical.reasons.length === 0 &&
            step("check")}
        </DecisionCard>

        <DecisionCard
          number={3}
          title={t.delivery.title}
          state={delivery.state}
          reasons={texts(delivery)}
          summary={
            d?.deliveredAt
              ? t.delivery.done(d.deliveredBy ?? "—", formatDate(d.deliveredAt))
              : delivery.state === "to_do"
                ? t.delivery.ready
                : null
          }
          note={
            [
              d?.deliveredAt && recipients.length > 0
                ? `${fr.productionLight.recipients.deliveredTo} : ${recipients.join(", ")}.`
                : null,
              d?.deliveredAt ? t.delivery.notPublished : null,
              canOrganize && d?.checkedAt ? t.delivery.reopenHint : null,
            ]
              .filter(Boolean)
              .join(" ") || undefined
          }
        >
          {d?.finalUrl && (
            <a
              href={d.finalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ size: "sm", variant: "outline" })}
            >
              <ButtonRoll>{t.delivery.final}</ButtonRoll>
            </a>
          )}
          {canOrganize &&
            delivery.state === "to_do" &&
            !deliver &&
            step("deliver")}
          {canOrganize && (
            <FinalFileButton
              projectId={projectId}
              deliverableId={deliverable.id}
              current={
                d?.finalUrl ? { url: d.finalUrl, note: d.finalNote } : null
              }
              proposed={
                data.version?.url
                  ? { url: data.version.url, version: data.version.number }
                  : null
              }
              onVersion
            />
          )}
          {canOrganize && d?.checkedAt && step("reopen")}
        </DecisionCard>
      </Rows>
      {delivery.state === "to_do" && deliver}
    </StepSection>
  );
}
