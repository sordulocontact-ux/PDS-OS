import { IconCheck } from "nucleo-sharp-essential";

import { AddProof } from "@/components/distribution/deposit/add-proof";
import { CorrectionsForm } from "@/components/distribution/deposit/corrections-form";
import { DepositForm } from "@/components/distribution/deposit/deposit-form";
import { WithdrawButton } from "@/components/distribution/declaration-forms";
import { OrchardForm } from "@/components/distribution/deposit/orchard-form";
import { DossierCard } from "@/components/distribution/dossier/dossier-card";
import { FactRow, FactRows } from "@/components/ui/fact-row";
import { ToneCallout } from "@/components/ui/tone-callout";
import { VersionCard } from "@/components/ui/version-card";
import type { DistributionContext } from "@/lib/distribution/journey-context";
import {
  evidenceOf,
  ORCHARD_ANSWERS as ANSWERS,
  type Declaration,
  type OrchardAnswer as Answer,
} from "@/lib/distribution/tracking";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";
import { formatDay, formatShortInstant } from "@/lib/utils/day";

const t = fr.distributionJourney.deposit;
const o = fr.distributionJourney.orchard;

const todayIso = () => new Date().toISOString().slice(0, 10);

/**
 * « Dépôt dans The Orchard » (proto step `deposit`): the manual deposit
 * said where it is made, the validated dossier to copy value by value, then
 * the declaration — or, once declared, what was declared and its proof.
 */
export function DepositStep({ ctx }: { ctx: DistributionContext }) {
  const open = ctx.view.open;
  const deposit = ctx.cycle?.deposit ?? null;
  if (deposit) return <DepositDone ctx={ctx} deposit={deposit} />;
  if (!open || open.status !== "approved" || !ctx.tracking.organizationId)
    return null;
  return (
    <div className="flex flex-col gap-4">
      {ctx.view.drift.length > 0 && (
        <ToneCallout tone="warning">
          {t.drift(
            ctx.view.drift
              .map((d) => `${d.label} ${d.now ?? ""}`.trim())
              .join(", "),
            open.number + 1,
          )}
        </ToneCallout>
      )}
      <ToneCallout tone="info">{t.manual}</ToneCallout>
      <VersionCard title={t.copyTitle} meta={t.copyMeta} defaultOpen>
        <DossierCard
          projectId={ctx.project.id}
          projectTitle={ctx.project.title}
          number={open.number}
          stateLine={fr.distributionJourney.dossier.approvedLine(
            formatShortInstant(open.decidedAt ?? open.submittedAt),
            open.decidedBy,
          )}
          pill={{
            tone: "success",
            label: fr.distributionJourney.dossier.pills.approved,
          }}
          sections={open.snapshot?.sections ?? ctx.view.sections}
          items={ctx.view.readiness.items}
          params={ctx.paramsData}
          releaseSource={ctx.dates.release?.source ?? null}
          mode="copy"
        />
      </VersionCard>
      {ctx.tracking.canEdit && (
        <DepositForm
          projectId={ctx.project.id}
          organizationId={ctx.tracking.organizationId}
          today={todayIso()}
        />
      )}
    </div>
  );
}

function DepositDone({
  ctx,
  deposit,
}: {
  ctx: DistributionContext;
  deposit: Declaration;
}) {
  const evidence = evidenceOf(deposit);
  return (
    <FactRows>
      <FactRow
        label={t.doneFact}
        value={t.doneValue(deposit.version)}
        source={`${t.doneSource(
          formatShortInstant(deposit.declaredAt),
          deposit.declaredBy,
          deposit.declaredOn ? formatDay(deposit.declaredOn) : null,
          deposit.orchardId,
        )}${deposit.source ? ` · ${fr.distribution.tracking.sources[deposit.source]}` : ""}`}
        state={{
          tone: "neutral",
          label: fr.distribution.tracking.evidence[evidence],
        }}
        side={
          deposit.proof?.href ? (
            <a
              href={deposit.proof.href}
              target="_blank"
              rel="noreferrer"
              className="text-[length:var(--type-caption)] underline underline-offset-4"
            >
              {t.seeProof}
            </a>
          ) : !deposit.proof &&
            !deposit.proofUrl &&
            ctx.tracking.canEdit &&
            ctx.tracking.organizationId ? (
            <AddProof
              projectId={ctx.project.id}
              organizationId={ctx.tracking.organizationId}
              declarationId={deposit.id}
            />
          ) : null
        }
        below={
          ctx.tracking.canEdit ? (
            <span>
              <WithdrawButton
                projectId={ctx.project.id}
                declarationId={deposit.id}
              />
            </span>
          ) : undefined
        }
      />
    </FactRows>
  );
}

const KIND_OF: Record<Answer, "received" | "outcome" | "delivered"> = {
  received: "received",
  accepted: "outcome",
  platforms_delivered: "delivered",
};

/**
 * « Réponse de The Orchard » (proto step `orchard`, VISION-UX rule 7): the
 * frieze Déposé · Reçu · Accepté · Livré aux plateformes, each point with
 * its date and its proof, then what The Orchard said, ticked and saved in
 * one gesture, and its corrections in another.
 */
export function OrchardStep({ ctx }: { ctx: DistributionContext }) {
  const cycle = ctx.cycle;
  if (!cycle?.deposit) return null;
  const declared = (k: Answer): Declaration | null => {
    const d = cycle[KIND_OF[k]];
    return d && (k !== "accepted" || d.kind === "accepted") ? d : null;
  };
  const left = ANSWERS.filter((k) => !declared(k));
  const current = left[0] ?? null;
  const org = ctx.tracking.organizationId;
  const canEdit = ctx.tracking.canEdit && org !== null;
  const nodes: Array<{ key: Answer | "deposit"; d: Declaration | null }> = [
    { key: "deposit", d: cycle.deposit },
    ...ANSWERS.map((k) => ({ key: k, d: declared(k) })),
  ];
  return (
    <div className="flex flex-col gap-4">
      <ol
        aria-label={o.frieze(cycle.version)}
        className="grid gap-3 rounded-xl border border-[color:var(--border-hairline)] p-4 sm:grid-cols-4"
      >
        {nodes.map(({ key, d }) => {
          const now = !d && key === current;
          return (
            <li key={key} className="flex flex-col gap-1">
              <span
                aria-hidden
                className={cn(
                  "grid size-6 place-items-center rounded-full border-2 border-[color:var(--border-default)]",
                  d &&
                    "border-transparent bg-[var(--tone-success-bg)] text-[color:var(--tone-success-fg)]",
                  now &&
                    "border-[color:var(--tone-warning-fg)] bg-[var(--tone-warning-bg)]",
                )}
              >
                {d ? (
                  <IconCheck className="size-3.5" />
                ) : now ? (
                  <span className="size-2 rounded-full bg-[var(--tone-warning-fg)]" />
                ) : null}
              </span>
              <b className="font-semibold">{o.nodes[key]}</b>
              <span
                className={cn(
                  "text-[length:var(--type-caption)] leading-[var(--type-caption-lh)] text-[color:var(--text-secondary)]",
                  now && "text-[color:var(--tone-warning-fg)]",
                )}
              >
                {d
                  ? `${d.declaredOn ? formatDay(d.declaredOn) : o.noDate} · ${evidenceOf(d) === "proven" ? o.proven : o.unproven}${d.source ? ` · ${fr.distribution.tracking.sources[d.source]}` : ""}`
                  : now
                    ? o.waiting
                    : o.notYet}
              </span>
              {d && evidenceOf(d) === "declared" && canEdit && org && (
                <AddProof
                  projectId={ctx.project.id}
                  organizationId={org}
                  declarationId={d.id}
                />
              )}
              {d && key !== "deposit" && canEdit && (
                <span>
                  <WithdrawButton
                    projectId={ctx.project.id}
                    declarationId={d.id}
                  />
                </span>
              )}
            </li>
          );
        })}
      </ol>
      {canEdit && org && left.length > 0 && (
        <OrchardForm
          projectId={ctx.project.id}
          organizationId={org}
          left={left}
          today={todayIso()}
        />
      )}
      {canEdit && !declared("accepted") && (
        <CorrectionsForm projectId={ctx.project.id} next={cycle.version + 1} />
      )}
    </div>
  );
}
