import { IconStop } from "@/components/icons";
import {
  ChecksBlock,
  type CheckLine,
} from "@/components/distribution/dossier/checks-block";
import { DossierCard } from "@/components/distribution/dossier/dossier-card";
import { DerogationForm } from "@/components/distribution/dossier/derogation-form";
import { DerogationNote } from "@/components/distribution/dossier/derogation-note";
import {
  DecideDossier,
  PrepareNext,
  SubmitDossier,
} from "@/components/distribution/dossier/dossier-gestures";
import { buttonVariants, ButtonRoll } from "@/components/ui/button";
import { ToneCallout } from "@/components/ui/tone-callout";
import { VersionCard } from "@/components/ui/version-card";
import { ViewLink } from "@/components/ui/view-link";
import { isOpen } from "@/lib/distribution/anomalies";
import type { DistributionContext } from "@/lib/distribution/journey-context";
import {
  driftModules,
  snapshotDrift,
  type DriftLine,
} from "@/lib/distribution/validation";
import { distribution } from "@/lib/i18n/fr/distribution";
import { distributionJourney } from "@/lib/i18n/fr/distribution-journey";
import { formatShortInstant } from "@/lib/utils/day";

const fr = { distribution, distributionJourney };

const t = fr.distributionJourney.dossier;
const k = fr.distributionJourney.checks;

const lines = (drift: DriftLine[]) =>
  drift.map((l) => t.driftLine(l.label, l.before, l.now)).join(" · ");

/**
 * The step « Dossier de livraison » (proto `UI.submit` / `UI.decide` and the
 * done view): the document in head, then the six checks, then the gesture
 * of the person looking — submit (owner), decide on the evidence
 * (validator), or prepare the next version once a source changed.
 */
export function DossierStep({ ctx }: { ctx: DistributionContext }) {
  const v = ctx.view;
  const open = v.open;
  const previous =
    v.versions.find((x) => !open || x.number < open.number) ?? null;
  const number = open?.number ?? (v.versions[0]?.number ?? 0) + 1;
  const validator = ctx.validator?.name ?? fr.distributionJourney.toAppoint;
  const owner = ctx.project.ownerName ?? "—";
  const blockers = v.readiness.blockers;
  const anomalies = ctx.anomalies.filter(isOpen);

  // Since the version replaced or refused: what the next one changes.
  const sinceLines =
    !open && previous?.snapshot
      ? snapshotDrift(previous.snapshot.sections, v.sections)
      : [];
  const sincePrevious =
    !open && (previous?.supersededAt || previous?.status === "rejected");
  const fromOrchard = previous
    ? anomalies.find((a) => a.fromDistributor && a.version === previous.number)
    : undefined;
  const change =
    open?.status === "approved" && v.drift.length > 0
      ? {
          tone: "warning" as const,
          text: t.driftApproved(open.number, lines(v.drift)),
        }
      : sincePrevious && sinceLines.length > 0
        ? {
            tone: "info" as const,
            text: t.driftSince(previous.number, lines(sinceLines)),
          }
        : !open && previous?.supersededAt && fromOrchard
          ? { tone: "warning" as const, text: t.nothingSince(previous.number) }
          : null;

  const checks: CheckLine[] = v.checks.map((c) => ({
    key: c.key,
    result: c.result,
    note: c.note,
    by:
      c.checkedByName && c.checkedAt
        ? k.by(
            c.checkedByName,
            formatShortInstant(c.checkedAt),
            c.version ?? null,
          )
        : null,
    computed: c.computed,
  }));
  const nonCompliant = checks.filter(
    (c) => c.result === "non_compliant",
  ).length;
  const gate = v.gate;
  const d = fr.distributionJourney.derogation;

  const card = (
    <DossierCard
      projectId={ctx.project.id}
      projectTitle={ctx.project.title}
      number={number}
      stateLine={
        !open
          ? t.preparing
          : open.status === "pending"
            ? t.submittedLine(
                formatShortInstant(open.submittedAt),
                open.submittedBy,
                open.validatorName,
              )
            : t.approvedLine(
                formatShortInstant(open.decidedAt ?? open.submittedAt),
                open.decidedBy,
              )
      }
      pill={
        !open
          ? { tone: "neutral", label: t.pills.preparing }
          : open.status === "pending"
            ? { tone: "warning", label: t.pills.pending }
            : { tone: "success", label: t.pills.approved }
      }
      sections={open?.snapshot?.sections ?? v.sections}
      items={v.readiness.items}
      params={ctx.paramsData}
      releaseSource={ctx.dates.release?.source ?? null}
      change={change}
      mode={!open && v.canEdit ? "edit" : "read"}
    />
  );

  return (
    <div className="flex flex-col gap-4">
      {!open && v.canEdit && blockers.length > 0 && (
        <ToneCallout
          tone="danger"
          icon={<IconStop />}
          as="div"
          contentClassName="flex flex-col gap-2"
        >
          <span>
            <strong className="font-semibold">
              {t.blockers(blockers.length)}
            </strong>{" "}
            {t.blockersBody}
          </span>
          <span className="flex flex-wrap gap-2">
            {blockers.map((b) => (
              <ViewLink
                key={b.key}
                href={b.href}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                <ButtonRoll>
                  {t.blockerButton(b.label, fr.distribution.modules[b.module])}
                </ButtonRoll>
              </ViewLink>
            ))}
          </span>
        </ToneCallout>
      )}
      {open?.status === "pending" && !v.canDecide && (
        <ToneCallout tone="info">
          {t.waiting(validator, open.number)}
        </ToneCallout>
      )}
      {open?.derogation && (
        <DerogationNote
          derogation={open.derogation}
          head={d.onVersion(open.number)}
        />
      )}
      {card}
      {open?.status === "approved" &&
        v.canEdit &&
        (v.drift.length > 0 ? (
          <section className="flex flex-col gap-2.5">
            <h3 className="text-[length:var(--type-body-md)] font-semibold">
              {t.prepareTitle(number + 1)}
            </h3>
            <PrepareNext
              projectId={ctx.project.id}
              number={number + 1}
              proposal={lines(v.drift)}
              modules={driftModules(v.drift)}
            />
          </section>
        ) : anomalies.length > 0 ? (
          <VersionCard
            title={t.prepareTitle(number + 1)}
            meta={t.openAnomalies(anomalies.length)}
          >
            <PrepareNext
              projectId={ctx.project.id}
              number={number + 1}
              proposal=""
              modules={[...new Set(anomalies.map((x) => x.module))]}
            />
          </VersionCard>
        ) : null)}
      <ChecksBlock
        projectId={ctx.project.id}
        checks={checks}
        coverFromTitle={ctx.paramsData.coverFromTitle}
        // The validator records the checks left while the version waits.
        editable={
          (!open && v.canCheck) || (open?.status === "pending" && v.canDecide)
        }
      />
      {!open && v.derogation && (
        <DerogationNote
          derogation={v.derogation}
          revoke={v.canDerogate ? ctx.project.id : undefined}
        />
      )}
      {!open &&
        v.canDerogate &&
        gate.derogable.length > 0 &&
        !gate.derogated && (
          <DerogationForm
            projectId={ctx.project.id}
            blocking={gate.derogable.map((x) => x.scope)}
          />
        )}
      {!open && v.canEdit && (
        <>
          {nonCompliant > 0 && (
            <ToneCallout tone="danger">
              {t.nonCompliant(nonCompliant)}
            </ToneCallout>
          )}
          {gate.derogable.length > 0 && (
            <ToneCallout
              tone={gate.derogated ? "warning" : "danger"}
              as="div"
              contentClassName="flex flex-col gap-1"
            >
              <strong className="font-semibold">{t.cannotSubmit}</strong>
              {gate.derogable.map((x) => (
                <span key={x.scope}>{x.text}</span>
              ))}
              <span>
                {gate.derogated
                  ? t.derogated(v.derogation?.grantedBy ?? null)
                  : v.canDerogate
                    ? null
                    : d.askDirection}
              </span>
            </ToneCallout>
          )}
          <SubmitDossier
            projectId={ctx.project.id}
            number={number}
            validator={validator}
            blocked={blockers.length > 0}
          />
        </>
      )}
      {open?.status === "pending" && v.canDecide && (
        <>
          {checks.some((x) => x.result === "unchecked") &&
            !open.derogation?.scope.includes("checks") && (
              <ToneCallout tone="warning">
                {t.checksBeforeApproval(
                  checks.filter((x) => x.result === "unchecked").length,
                )}
              </ToneCallout>
            )}
          <ToneCallout tone="info">
            <strong className="font-semibold">{t.unknownLabel}</strong>{" "}
            {t.unknown}
          </ToneCallout>
          <p className="text-[length:var(--type-body-sm)] text-[color:var(--text-secondary)]">
            {t.approveNote(owner)}
          </p>
          <DecideDossier
            projectId={ctx.project.id}
            versionId={open.id}
            number={open.number}
            owner={owner}
          />
        </>
      )}
      <PreviousVersions ctx={ctx} current={number} />
    </div>
  );
}

function PreviousVersions({
  ctx,
  current,
}: {
  ctx: DistributionContext;
  current: number;
}) {
  const old = ctx.view.versions.filter((x) => x.number < current);
  if (old.length === 0) return null;
  return (
    <VersionCard title={t.versions} meta={old.length}>
      <ul className="flex flex-col gap-1.5 text-[length:var(--type-body-sm)]">
        {old.map((x) => {
          const status = x.supersededAt ? "superseded" : x.status;
          const at = x.supersededAt ?? x.decidedAt;
          return (
            <li key={x.id}>
              <b className="font-semibold">V{x.number}</b>
              {` · ${t.versionStatus[status]} · ${formatShortInstant(x.submittedAt)}`}
              {at && status !== "pending"
                ? t.versionDecided(
                    t.verbs[status],
                    formatShortInstant(at),
                    x.decidedBy,
                    x.note,
                  )
                : ""}
            </li>
          );
        })}
      </ul>
    </VersionCard>
  );
}

/** The reason that comes back in head of the owner's step (rule 6): the
 * validator's refusal, or The Orchard's corrections as declared. */
export function dossierReturn(ctx: DistributionContext) {
  const v = ctx.view;
  if (v.open) return null;
  const latest = v.versions[0];
  if (!latest) return null;
  if (latest.status === "rejected" && latest.note)
    return {
      by: latest.decidedBy ?? "—",
      outcome: t.returnedOutcome,
      note: latest.note,
      modules: latest.refusalModules,
    };
  const from = ctx.anomalies.find(
    (a) => isOpen(a) && a.fromDistributor && a.version === latest.number,
  );
  return from
    ? {
        by: fr.distributionJourney.distributor,
        outcome: t.distributorReturn(from.reportedBy ?? "—"),
        note: from.description,
        modules: [from.module],
      }
    : null;
}
