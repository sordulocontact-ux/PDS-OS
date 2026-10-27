import {
  AddPlatform,
  DeclareAvailability,
  DetectNow,
} from "@/components/distribution/platforms/platform-tools";
import {
  PlatformRow,
  type PlatformLine,
} from "@/components/distribution/platforms/platform-row";
import { buttonVariants } from "@/components/ui/button";
import { FactRow, FactRows } from "@/components/ui/fact-row";
import { ToneCallout } from "@/components/ui/tone-callout";
import { ViewLink } from "@/components/ui/view-link";
import { isOpen } from "@/lib/distribution/anomalies";
import type { DistributionContext } from "@/lib/distribution/journey-context";
import { platformLabel } from "@/lib/distribution/platforms";
import { distribution } from "@/lib/i18n/fr/distribution";
import { distributionJourney } from "@/lib/i18n/fr/distribution-journey";
import { distributionViewHref } from "@/lib/ui/distribution-steps";
import { formatShortDay, formatShortInstant } from "@/lib/utils/day";

const fr = { distribution, distributionJourney };

const t = fr.distributionJourney.platforms;
const p = fr.distribution.platforms;

/**
 * « Plateformes » (proto `platformsView`): the public availability, then
 * each platform's link — the detection's proposed with its source, never a
 * verification — and what a person saw by opening it; the anomalies they
 * opened.
 */
export function PlatformsStep({ ctx }: { ctx: DistributionContext }) {
  const view = ctx.platforms;
  const step = ctx.steps.find((s) => s.key === "platforms");
  // Closed with reserves: the step is over with the workflow (read only); a
  // reopening of the closure brings the verifications back.
  const closed = step?.status === "done" && step.reserve === true;
  const mine = view.canCheck && step?.status !== "blocked" && !closed;
  const declared = view.cycle?.available ?? null;
  const detected = view.platforms.some((x) => x.suggestedAt);
  const verified = view.availability.verified;
  const lines: PlatformLine[] = view.platforms.map((x) => {
    const url = x.url ?? x.suggestion;
    const day = x.fromDetection ?? (x.url ? null : x.suggestedAt);
    const nextCount =
      x.reference && x.verification !== "verified" ? verified + 1 : verified;
    return {
      platform: x.platform,
      name: platformLabel(x),
      extra: !x.reference,
      url,
      saved: x.url !== null,
      source: day
        ? t.fromDetection(formatShortDay(day, { bare: true }))
        : url
          ? null
          : t.noLink(detected),
      verification: x.verification,
      compliance: x.compliance,
      by: x.verified
        ? t.verifiedBy(
            x.verified.by,
            formatShortInstant(x.verified.at),
            x.verificationNote ?? x.complianceNote,
          )
        : null,
      seen:
        x.verification === "verified" && x.observedOn
          ? t.seenLine(formatShortDay(x.observedOn), x.territory)
          : null,
      proof: x.proof
        ? { label: t.proofLabel(x.proof.name), href: x.proof.href }
        : x.proofUrl
          ? { label: t.proofLinkLabel, href: x.proofUrl }
          : null,
      nextCount,
    };
  });
  // The territory typed last, proposed for the next platform.
  const territory =
    [...view.platforms]
      .filter((x) => x.territory && x.verified)
      .sort((a, b) =>
        (b.verified?.at ?? "").localeCompare(a.verified?.at ?? ""),
      )[0]?.territory ?? "";
  const anomalies = ctx.anomalies.filter((a) => a.platform);
  const done = step?.status === "done";
  return (
    <div className="flex flex-col gap-4">
      <FactRows>
        <FactRow
          label={t.availability}
          value={
            <b className="font-semibold">
              {p.availabilityStates[view.availability.state]}
            </b>
          }
          source={t.summary(
            view.availability.verified,
            declared
              ? t.declaredBy(
                  formatShortInstant(declared.declaredAt),
                  declared.declaredBy,
                  Boolean(declared.proof || declared.proofUrl),
                )
              : null,
          )}
          state={{
            tone: view.availability.verified === 5 ? "success" : "neutral",
            label: t.count(view.availability.verified),
          }}
          side={
            mine && view.canEdit && !declared ? (
              <DeclareAvailability projectId={ctx.project.id} />
            ) : null
          }
        />
      </FactRows>
      {step?.status === "waiting" && (
        <ToneCallout
          tone="warning"
          as="div"
          contentClassName="flex flex-col gap-2"
        >
          <span>{t.waitingDetection(ctx.paramsData.releaseDay)}</span>
          {mine && <DetectNow projectId={ctx.project.id} />}
        </ToneCallout>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[length:var(--type-body-md)] font-semibold">
          {t.list}
        </h3>
        {mine && view.canEdit && <AddPlatform projectId={ctx.project.id} />}
      </div>
      <div className="flex flex-col overflow-hidden rounded-xl border border-[color:var(--border-hairline)]">
        {lines.map((line) => (
          <PlatformRow
            key={line.platform}
            projectId={ctx.project.id}
            line={line}
            canAct={mine}
            organizationId={view.organizationId}
            territory={territory}
            members={ctx.closure.members}
            ownerPersonId={ctx.project.ownerPersonId}
          />
        ))}
      </div>
      {anomalies.length > 0 && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-[length:var(--type-body-md)] font-semibold">
              {t.anomalies}
            </h3>
            <ViewLink
              href={distributionViewHref(ctx.project.id, "anomalies")}
              className={buttonVariants({ variant: "link", size: "sm" })}
            >
              {t.allAnomalies}
            </ViewLink>
          </div>
          <FactRows>
            {anomalies.map((a) => (
              <FactRow
                key={a.id}
                label={`${fr.distribution.anomalies.kinds[a.kind]} · ${platformLabel({ platform: a.platform ?? "", label: null })}`}
                value={`« ${a.description} »`}
                source={[
                  fr.distribution.anomalies.correctIn(
                    fr.distribution.anomalies.modules[a.module],
                  ),
                  a.action
                    ? t.anomalyAction(
                        a.action,
                        a.ownerName,
                        a.dueOn ? formatShortDay(a.dueOn) : null,
                      )
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
                state={{
                  tone: isOpen(a) ? "danger" : "neutral",
                  label: fr.distribution.anomalies.states[a.state],
                }}
              />
            ))}
          </FactRows>
        </>
      )}
      {closed ? (
        <ToneCallout tone="warning">
          <strong className="font-semibold">{t.closedReserves}</strong>{" "}
          {t.closedReservesBody}
        </ToneCallout>
      ) : (
        done && (
          <ToneCallout tone="success">
            <strong className="font-semibold">{t.done}</strong> {t.doneBody}
          </ToneCallout>
        )
      )}
    </div>
  );
}
