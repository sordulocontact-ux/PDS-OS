import {
  DecideClosure,
  ProposeClosure,
  ReopenClosure,
} from "@/components/distribution/closure/closure-gestures";
import { StopDistribution } from "@/components/distribution/closure/stop-distribution";
import { ReserveList } from "@/components/distribution/closure/reserve-list";
import { FactRow, FactRows } from "@/components/ui/fact-row";
import { ToneCallout } from "@/components/ui/tone-callout";
import type { Reserve } from "@/lib/distribution/closure";
import type { DistributionContext } from "@/lib/distribution/journey-context";
import { fr } from "@/lib/i18n/fr";
import { formatShortInstant } from "@/lib/utils/day";

const t = fr.distributionJourney.closure;
const c = fr.distribution.closure;

function Conditions({ ctx }: { ctx: DistributionContext }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-[length:var(--type-body-md)] font-semibold">
        {t.conditions}
      </h3>
      <FactRows>
        {ctx.closure.readiness.conditions.map((x) => (
          <FactRow
            key={x.key}
            value={`${x.met ? "✓" : "○"} ${x.label}`}
            source={
              x.met
                ? null
                : (ctx.closure.readiness.reserves
                    .find((r) => r.cause === x.key)
                    ?.details.join(" · ") ?? null)
            }
            state={{
              tone: x.met ? "success" : "neutral",
              label: x.met ? t.met : t.unmet,
            }}
          />
        ))}
      </FactRows>
    </section>
  );
}

/** The reserves of a proposal, as the decider reads them. */
function Proposed({ reserves }: { reserves: Reserve[] }) {
  return (
    <FactRows>
      {reserves.map((r) => (
        <FactRow
          key={r.cause}
          value={<b className="font-semibold">{r.label}</b>}
          source={r.details.join(" · ")}
          state={{ tone: "warning", label: c.criticalities[r.criticality] }}
        />
      ))}
    </FactRows>
  );
}

/**
 * « Clôture » (proto step `closure`): the conditions of a normal closure,
 * then the owner's proposal — normal, with reserves (each followed by a
 * member, by a date, with the proof that lifts it), or, ahead of The
 * Orchard's acceptance, a decision of the direction (recette DIST-003) —,
 * the decision, and once closed the reserves followed until lifted
 * (DIST-007), never green, with « Rouvrir le suivi ».
 */
export function ClosureStep({ ctx }: { ctx: DistributionContext }) {
  const cl = ctx.closure;
  const current = cl.current;
  const owner = ctx.project.ownerName ?? "—";
  const validator = ctx.validator?.name ?? fr.distributionJourney.toAppoint;
  const direction = t.directionDecides;
  const step = ctx.steps.find((s) => s.key === "closure");
  if (current?.status === "closed") {
    const stopped =
      current.kind === "cancelled" || current.kind === "abandoned";
    const label = stopped
      ? c.kinds[current.kind]
      : current.kind === "reserves"
        ? fr.distributionJourney.summary.closedReserves(current.reserves.length)
        : fr.distributionJourney.summary.closedNormal;
    const at = formatShortInstant(current.decidedAt ?? current.proposedAt);
    return (
      <div className="flex flex-col gap-4">
        <ToneCallout
          tone={current.kind === "normal" ? "success" : "warning"}
          as="div"
        >
          <strong className="font-semibold">
            {stopped && current.reasonKind
              ? t.closedStop(
                  label,
                  c.reasonKinds[current.reasonKind],
                  at,
                  current.decidedBy,
                )
              : t.closed(label, at, current.decidedBy)}
          </strong>
          {current.arbitration && (
            <span className="block">
              {t.arbitrationLine(current.arbitration)}
            </span>
          )}
        </ToneCallout>
        {cl.reserveRows.length > 0 && (
          <ReserveList
            projectId={ctx.project.id}
            organizationId={ctx.tracking.organizationId}
            rows={cl.reserveRows}
          />
        )}
        {cl.canEdit && <ReopenClosure projectId={ctx.project.id} />}
      </div>
    );
  }
  if (current?.status === "pending") {
    const ahead =
      current.kind === "cancelled" ||
      current.kind === "abandoned" ||
      current.early;
    return (
      <div className="flex flex-col gap-4">
        {!cl.canDecide && (
          <ToneCallout tone="info">
            {t.waiting(ahead ? direction : validator)}
          </ToneCallout>
        )}
        <FactRows>
          <FactRow
            label={t.proposal}
            value={
              <b className="font-semibold">
                {c.kinds[current.kind]}
                {current.reasonKind
                  ? ` · ${c.reasonKinds[current.reasonKind]}`
                  : ""}
              </b>
            }
            source={t.proposedBy(
              formatShortInstant(current.proposedAt),
              current.proposedBy,
            )}
          />
          {current.arbitration && (
            <FactRow
              label={c.arbitration}
              value={`« ${current.arbitration} »`}
              source={current.proposedBy}
            />
          )}
        </FactRows>
        <Conditions ctx={ctx} />
        {current.reserves.length > 0 && (
          <>
            <h3 className="text-[length:var(--type-body-md)] font-semibold">
              {t.reservesKept}
            </h3>
            <Proposed reserves={current.reserves} />
          </>
        )}
        {cl.canDecide && (
          <>
            <p className="text-[length:var(--type-body-sm)] text-[color:var(--text-secondary)]">
              {t.decideNote}
            </p>
            <DecideClosure
              projectId={ctx.project.id}
              closureId={current.id}
              owner={owner}
            />
          </>
        )}
      </div>
    );
  }
  const reserves = cl.readiness.reserves;
  const proposes =
    cl.canEdit && cl.readiness.canPropose && step?.status !== "blocked";
  return (
    <div className="flex flex-col gap-4">
      <Conditions ctx={ctx} />
      {proposes &&
        (reserves.length === 0 ? (
          <ToneCallout tone="info">{t.noReserve(validator)}</ToneCallout>
        ) : (
          <section className="flex flex-col gap-2">
            <h3 className="text-[length:var(--type-body-md)] font-semibold">
              {t.reserves}
            </h3>
            <p className="text-[length:var(--type-body-sm)] text-[color:var(--text-secondary)]">
              {t.reservesBody}
            </p>
          </section>
        ))}
      {proposes && (
        <ProposeClosure
          projectId={ctx.project.id}
          reserves={reserves}
          accepted={cl.readiness.accepted}
          members={cl.members}
          ownerPersonId={ctx.project.ownerPersonId}
          validator={validator}
          direction={direction}
        />
      )}
      {cl.canEdit && <StopDistribution projectId={ctx.project.id} />}
      {!cl.canEdit && (
        <p className="text-[length:var(--type-body-sm)] text-[color:var(--text-secondary)]">
          {t.later(owner)}
        </p>
      )}
    </div>
  );
}

/** A refused closure's reason, in head of the owner's step (rule 6). */
export function closureReturn(ctx: DistributionContext) {
  const latest = ctx.closure.closures[0];
  return latest?.status === "rejected" && latest.decisionNote
    ? { by: latest.decidedBy ?? "—", note: latest.decisionNote }
    : null;
}
