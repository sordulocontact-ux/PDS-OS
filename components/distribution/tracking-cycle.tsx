import {
  DeclarationButton,
  WithdrawButton,
} from "@/components/distribution/declaration-forms";
import { PageSection } from "@/components/shell/page-section";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  declarable,
  evidenceOf,
  type CycleState,
  type Declaration,
} from "@/lib/distribution/tracking";
import { fr } from "@/lib/i18n/fr";
import { formatShortDate } from "@/lib/release/format";
import { distributionEvidenceTone } from "@/lib/ui/state-tones";

const t = fr.distribution.tracking;

type Row = {
  key: "deposit" | "received" | "outcome" | "delivered";
  declaration: Declaration | null;
  value: string;
};

/**
 * One deposit cycle (§ 7): four separate states, each with what was
 * declared, by whom, when, with or without proof; the owner's next
 * declarations below. Nothing is deduced from another state.
 */
export function TrackingCycle({
  projectId,
  organizationId,
  state,
  canEdit,
}: {
  projectId: string;
  organizationId: string | null;
  state: CycleState;
  canEdit: boolean;
}) {
  const rows: Row[] = [
    {
      key: "deposit",
      declaration: state.deposit,
      value: state.deposit ? t.values.deposit.done : t.values.deposit.none,
    },
    {
      key: "received",
      declaration: state.received,
      value: state.received ? t.values.received.done : t.values.received.none,
    },
    {
      key: "outcome",
      declaration: state.outcome,
      value: state.outcome
        ? state.outcome.kind === "corrections_requested"
          ? t.values.outcome.corrections_requested
          : t.values.outcome.accepted
        : t.values.outcome.none,
    },
    {
      key: "delivered",
      declaration: state.delivered,
      value: state.delivered
        ? t.values.delivered.done
        : t.values.delivered.none,
    },
  ];
  const next = declarable(state);
  return (
    <PageSection
      id={`cycle-${state.version}`}
      title={t.cycle(state.version)}
      description={t.cycleHint}
      card
    >
      <div className="grid gap-5">
        <ul className="grid gap-4">
          {rows.map((row) => (
            <li
              key={row.key}
              className="grid gap-1 sm:grid-cols-[14rem_minmax(0,1fr)] sm:gap-4"
            >
              <p className="text-sm text-muted-foreground">
                {t.states[row.key]}
              </p>
              <DeclarationDetail
                projectId={projectId}
                value={row.value}
                declaration={row.declaration}
                canEdit={canEdit}
              />
            </li>
          ))}
        </ul>
        {canEdit && organizationId && next.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {next.map((kind, index) => (
              <DeclarationButton
                key={kind}
                projectId={projectId}
                organizationId={organizationId}
                kind={kind}
                primary={index === 0}
              />
            ))}
          </div>
        )}
      </div>
    </PageSection>
  );
}

function DeclarationDetail({
  projectId,
  value,
  declaration,
  canEdit,
}: {
  projectId: string;
  value: string;
  declaration: Declaration | null;
  canEdit: boolean;
}) {
  if (!declaration)
    return (
      <p>
        <StatusBadge tone={distributionEvidenceTone.none} size="sm">
          {value}
        </StatusBadge>
      </p>
    );
  const evidence = evidenceOf(declaration);
  const tone =
    declaration.kind === "corrections_requested"
      ? distributionEvidenceTone.corrections
      : distributionEvidenceTone[evidence];
  return (
    <div className="grid min-w-0 gap-1">
      <p className="flex flex-wrap items-center gap-2">
        <span className="font-medium">{value}</span>
        <StatusBadge tone={tone} size="sm">
          {t.evidence[evidence]}
        </StatusBadge>
      </p>
      <p className="text-sm text-muted-foreground">
        {[
          t.by(declaration.declaredBy, formatShortDate(declaration.declaredAt)),
          declaration.declaredOn
            ? t.on(formatShortDate(declaration.declaredOn))
            : t.noDate,
          declaration.kind === "deposit"
            ? declaration.orchardId
              ? t.orchardId(declaration.orchardId)
              : t.noOrchardId
            : null,
        ]
          .filter(Boolean)
          .join(" · ")}
      </p>
      <ProofLinks declaration={declaration} />
      {declaration.note && (
        <p className="text-sm break-words text-muted-foreground">
          « {declaration.note} »
        </p>
      )}
      {canEdit && (
        <div>
          <WithdrawButton
            projectId={projectId}
            declarationId={declaration.id}
          />
        </div>
      )}
    </div>
  );
}

/** The proof: a file (signed link) and / or an outside link, or its absence. */
export function ProofLinks({ declaration }: { declaration: Declaration }) {
  const link =
    "font-medium underline-offset-4 hover:underline focus-visible:underline";
  if (!declaration.proof && !declaration.proofUrl)
    return <p className="text-sm text-muted-foreground">{t.noProof}</p>;
  return (
    <p className="flex flex-wrap gap-x-3 text-sm">
      {declaration.proof?.href && (
        <a
          href={declaration.proof.href}
          target="_blank"
          rel="noopener noreferrer"
          className={link}
        >
          {t.proof} · {declaration.proof.name}
        </a>
      )}
      {declaration.proofUrl && (
        <a
          href={declaration.proofUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={link}
        >
          {t.proofLink}
        </a>
      )}
    </p>
  );
}
