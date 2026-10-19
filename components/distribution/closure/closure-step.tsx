import {
  DecideClosure,
  ProposeClosure,
  ReopenClosure,
} from "@/components/distribution/closure/closure-gestures";
import { FactRow, FactRows } from "@/components/ui/fact-row";
import { ToneCallout } from "@/components/ui/tone-callout";
import type { DistributionContext } from "@/lib/distribution/journey-context";
import type { Reserve } from "@/lib/distribution/closure";
import { fr } from "@/lib/i18n/fr";
import { formatShortInstant } from "@/lib/utils/day";

const t = fr.distributionJourney.closure;

function Conditions({ ctx }: { ctx: DistributionContext }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-[length:var(--type-body-md)] font-semibold">
        {t.conditions}
      </h3>
      <FactRows>
        {ctx.closure.readiness.conditions.map((c) => (
          <FactRow
            key={c.key}
            value={`${c.met ? "✓" : "○"} ${c.label}`}
            source={
              c.met
                ? null
                : (ctx.closure.readiness.reserves
                    .find((r) => r.cause === c.key)
                    ?.details.join(" · ") ?? null)
            }
            state={{
              tone: c.met ? "success" : "neutral",
              label: c.met ? t.met : t.unmet,
            }}
          />
        ))}
      </FactRows>
    </section>
  );
}

function Reserves({ reserves, label }: { reserves: Reserve[]; label: string }) {
  return (
    <FactRows>
      {reserves.map((r) => (
        <FactRow
          key={r.cause}
          value={<b className="font-semibold">{r.label}</b>}
          source={r.details.join(" · ")}
          state={{ tone: "warning", label }}
        />
      ))}
    </FactRows>
  );
}

/**
 * « Clôture » (proto step `closure`): the conditions of a normal closure,
 * then the owner's proposal (normal, or with reserves arbitrated), the
 * validator's decision on the evidence, and once closed what it kept —
 * a reserve stays « non vérifiée », never green — with « Rouvrir le suivi ».
 */
export function ClosureStep({ ctx }: { ctx: DistributionContext }) {
  const c = ctx.closure;
  const current = c.current;
  const owner = ctx.project.ownerName ?? "—";
  const validator = ctx.validator?.name ?? fr.distributionJourney.toAppoint;
  const step = ctx.steps.find((s) => s.key === "closure");
  if (current?.status === "closed") {
    const label =
      current.kind === "reserves"
        ? fr.distributionJourney.summary.closedReserves(current.reserves.length)
        : fr.distributionJourney.summary.closedNormal;
    return (
      <div className="flex flex-col gap-4">
        <ToneCallout
          tone={current.kind === "reserves" ? "warning" : "success"}
          as="div"
        >
          <strong className="font-semibold">
            {t.closed(
              label,
              formatShortInstant(current.decidedAt ?? current.proposedAt),
              current.decidedBy,
            )}
          </strong>
          {current.arbitration && (
            <span className="block">
              {t.arbitrationLine(current.arbitration)}
            </span>
          )}
        </ToneCallout>
        {current.reserves.length > 0 && (
          <Reserves reserves={current.reserves} label={t.notVerified} />
        )}
        {c.canEdit && <ReopenClosure projectId={ctx.project.id} />}
      </div>
    );
  }
  if (current?.status === "pending") {
    return (
      <div className="flex flex-col gap-4">
        {!c.canDecide && (
          <ToneCallout tone="info">{t.waiting(validator)}</ToneCallout>
        )}
        <FactRows>
          <FactRow
            label={t.proposal}
            value={
              <b className="font-semibold">
                {fr.distribution.closure.kinds[current.kind]}
              </b>
            }
            source={t.proposedBy(
              formatShortInstant(current.proposedAt),
              current.proposedBy,
            )}
          />
          {current.arbitration && (
            <FactRow
              label={fr.distribution.closure.arbitration}
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
            <Reserves reserves={current.reserves} label={t.reserve} />
          </>
        )}
        {c.canDecide && (
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
  const reserves = c.readiness.reserves;
  const proposes =
    c.canEdit && c.readiness.canPropose && step?.status !== "blocked";
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
            <Reserves reserves={reserves} label={t.reserve} />
          </section>
        ))}
      {proposes && (
        <ProposeClosure
          projectId={ctx.project.id}
          reserves={reserves.length}
          validator={validator}
        />
      )}
      {!c.canEdit && (
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
