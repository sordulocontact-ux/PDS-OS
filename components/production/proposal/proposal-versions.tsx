import { buttonVariants } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { VersionCard } from "@/components/ui/version-card";
import { fr } from "@/lib/i18n/fr";
import {
  isSentBack,
  retainedOf,
  type ProposalExt,
  type ProposalVersion,
} from "@/lib/production/proposal/model";
import type { Tone } from "@/lib/ui/state-tones";
import { formatShortInstant } from "@/lib/utils/day";

const t = fr.productionProposal;
const SIDE_TONE: Record<ProposalExt | "stale", Tone> = {
  pending: "info",
  approved: "success",
  changes: "warning",
  none: "neutral",
  stale: "neutral",
};

/**
 * The proposal's versions, newest first (proto creativeCard): each one
 * folds (`VersionCard`, the latest and the retained open), says « Retenue »,
 * « À valider », « Modifications demandées » or « Remplacée par la Vn »,
 * opens its three pieces, shows each side's validation (a replaced one's
 * waiting side ends « Sans suite ») and what was said. The same in the step
 * and on the private links.
 */
export function ProposalVersions({
  versions,
}: {
  versions: ProposalVersion[];
}) {
  if (versions.length === 0) return null;
  const retained = retainedOf(versions);
  const latest = versions[0];
  return (
    <div className="flex flex-col gap-2">
      <h3 className="font-semibold">{t.versions}</h3>
      {versions.map((v) => {
        const isLatest = v.id === latest.id;
        const isRetained = v.id === retained?.id;
        const status = isRetained
          ? { tone: "success" as const, label: t.status.retained }
          : !isLatest
            ? {
                tone: "neutral" as const,
                label: t.status.replaced(v.number + 1),
              }
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
          <VersionCard
            key={v.id}
            title={t.version(v.number)}
            status={status}
            meta={t.deposited(v.depositedBy, formatShortInstant(v.depositedAt))}
            defaultOpen={isLatest || isRetained}
          >
            <ul className="flex flex-col divide-y divide-[color:var(--border-hairline)]">
              {pieces.map(([label, url]) => (
                <li
                  key={label}
                  className="flex flex-wrap items-center justify-between gap-2 py-2"
                >
                  <span className="min-w-0 break-all">
                    <b className="font-semibold">{label}</b> · {url}
                  </span>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonVariants({ variant: "ghost", size: "sm" })}
                  >
                    {t.open}
                  </a>
                </li>
              ))}
            </ul>
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
              <p className="text-[length:var(--type-micro)] leading-[var(--type-micro-lh)] text-[color:var(--text-secondary)]">
                {t.saidPlain(v.depositedBy, v.note)}
              </p>
            )}
            {v.intComment && (
              <p className="text-[length:var(--type-micro)] leading-[var(--type-micro-lh)] text-[color:var(--text-secondary)]">
                {t.said(v.intBy ?? "—", t.side.as.int, v.intComment)}
              </p>
            )}
            {v.extComment && (
              <p className="text-[length:var(--type-micro)] leading-[var(--type-micro-lh)] text-[color:var(--text-secondary)]">
                {t.said(v.extBy ?? "—", t.side.as.ext, v.extComment)}
              </p>
            )}
          </VersionCard>
        );
      })}
    </div>
  );
}
