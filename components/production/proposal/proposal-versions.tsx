import { StepSection } from "@/components/shell/journey/step-section";
import {
  DeliverableVersion,
  DeliverableVersions,
} from "@/components/ui/deliverable-version";
import { ButtonRoll, buttonVariants } from "@/components/ui/button";
import { FactRow, FactRows } from "@/components/ui/fact-row";
import { StatusBadge } from "@/components/ui/status-badge";
import { productionProposal } from "@/lib/i18n/fr/production-proposal";
import {
  isSentBack,
  retainedOf,
  type ProposalExt,
  type ProposalVersion,
} from "@/lib/production/proposal/model";
import type { Tone } from "@/lib/ui/state-tones";
import { formatShortInstant } from "@/lib/utils/day";

const fr = { productionProposal };

const t = fr.productionProposal;
const SIDE_TONE: Record<ProposalExt | "stale", Tone> = {
  pending: "info",
  approved: "success",
  changes: "warning",
  none: "neutral",
  stale: "neutral",
};

/**
 * The proposal's versions, newest first (proto creativeCard): the latest and
 * the retained one open as a `DeliverableVersion`, the others fold under
 * « Versions précédentes ». Each says « Retenue », « À valider »,
 * « Modifications demandées » or « Remplacée par la Vn », opens its three
 * pieces, shows each side's validation (a replaced one's waiting side ends
 * « Sans suite ») and what was said. The same in the step and on the
 * private links.
 */
export function ProposalVersions({
  versions,
}: {
  versions: ProposalVersion[];
}) {
  if (versions.length === 0) return null;
  const retained = retainedOf(versions);
  const latest = versions[0];
  const isCurrent = (v: ProposalVersion) =>
    v.id === latest.id || v.id === retained?.id;
  const render = (v: ProposalVersion) => {
    const isLatest = v.id === latest.id;
    const status =
      v.id === retained?.id
        ? { tone: "success" as const, label: t.status.retained }
        : !isLatest
          ? { tone: "neutral" as const, label: t.status.replaced(v.number + 1) }
          : isSentBack(v)
            ? { tone: "warning" as const, label: t.status.changes }
            : { tone: "info" as const, label: t.status.pending };
    const side = (s: ProposalExt) =>
      s === "pending" && !isLatest ? "stale" : s;
    const pieces = [
      [t.piece.treatment, v.treatmentUrl],
      [t.piece.moodboard, v.moodboardUrl],
      [t.piece.cutting, v.cuttingUrl],
    ].filter((p): p is [string, string] => Boolean(p[1]));
    return (
      <DeliverableVersion
        name={t.version(v.number)}
        line={t.deposited(v.depositedBy, formatShortInstant(v.depositedAt))}
        statuses={[status]}
      >
        <FactRows className="rounded-none border-0">
          {pieces.map(([label, url]) => (
            <FactRow
              key={label}
              label={label}
              value={<span className="break-all">{url}</span>}
              side={
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  <ButtonRoll>{t.open}</ButtonRoll>
                </a>
              }
            />
          ))}
        </FactRows>
        <div className="flex flex-wrap gap-2">
          <StatusBadge size="sm" tone={SIDE_TONE[side(v.int)]}>
            {`${t.side.int} · ${t.side.states[side(v.int)]}`}
          </StatusBadge>
          <StatusBadge size="sm" tone={SIDE_TONE[side(v.ext)]}>
            {v.ext === "none"
              ? t.side.states.none
              : `${t.side.ext} · ${t.side.states[side(v.ext)]}`}
          </StatusBadge>
        </div>
        {v.note && (
          <p className="text-[length:var(--type-body-sm)] text-[color:var(--text-secondary)]">
            {t.saidPlain(v.depositedBy, v.note)}
          </p>
        )}
        {v.intComment && (
          <p className="text-[length:var(--type-body-sm)] text-[color:var(--text-secondary)]">
            {t.said(v.intBy ?? "—", t.side.as.int, v.intComment)}
          </p>
        )}
        {v.extComment && (
          <p className="text-[length:var(--type-body-sm)] text-[color:var(--text-secondary)]">
            {t.said(v.extBy ?? "—", t.side.as.ext, v.extComment)}
          </p>
        )}
      </DeliverableVersion>
    );
  };
  return (
    <StepSection title={t.versions}>
      <DeliverableVersions
        versions={versions}
        isCurrent={isCurrent}
        render={render}
        earlierTitle={t.earlier}
      />
    </StepSection>
  );
}
