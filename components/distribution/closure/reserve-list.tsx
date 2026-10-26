import {
  DecideLift,
  RequestLift,
} from "@/components/distribution/closure/reserve-follow";
import { StatusBadge } from "@/components/ui/status-badge";
import type { ReserveRow } from "@/lib/distribution/closure-queries";
import { fr } from "@/lib/i18n/fr";
import { formatShortDay, formatShortInstant } from "@/lib/utils/day";

const t = fr.distributionJourney.closure;
const c = fr.distribution.closure;

const TONE = {
  open: "warning",
  lift_requested: "info",
  lifted: "neutral",
} as const;

/**
 * The reserves of a closure, followed until lifted (recette DIST-007): what
 * it is, its criticality, who follows it and by when, the proof expected;
 * « Lever la réserve » with the proof, then another person confirms. A
 * reserve past its deadline says so; a lifted one is never shown as a
 * verification (neutral, not green).
 */
export function ReserveList({
  projectId,
  organizationId,
  rows,
}: {
  projectId: string;
  organizationId: string | null;
  rows: ReserveRow[];
}) {
  const open = rows.filter((r) => r.status !== "lifted").length;
  return (
    <section className="flex flex-col gap-2.5">
      <h3 className="text-[length:var(--type-body-md)] font-semibold">
        {t.reserves}
      </h3>
      {open > 0 && (
        <p className="text-[length:var(--type-body-sm)] text-[color:var(--text-secondary)]">
          {t.stillOpen(open)}
        </p>
      )}
      <ul className="flex flex-col rounded-[var(--radius-lg)] border border-[color:var(--border-hairline)]">
        {rows.map((r) => (
          <li
            key={r.id}
            className="flex flex-col gap-2 border-b border-[color:var(--border-hairline)] px-3.5 py-3 last:border-b-0"
          >
            <div className="flex flex-wrap items-center gap-2">
              <b className="min-w-0 font-semibold">{r.label}</b>
              <span className="flex-1" />
              <StatusBadge tone="neutral" size="sm">
                {c.criticalities[r.criticality]}
              </StatusBadge>
              {r.overdue && (
                <StatusBadge tone="danger" size="sm">
                  {t.overdue}
                </StatusBadge>
              )}
              <StatusBadge tone={TONE[r.status]} size="sm">
                {t.reserveStatus[r.status]}
              </StatusBadge>
            </div>
            {r.details.length > 0 && (
              <p className="text-[length:var(--type-body-sm)] text-[color:var(--text-secondary)]">
                {r.details.join(" · ")}
              </p>
            )}
            <p className="text-[length:var(--type-body-sm)]">
              {t.reserveLine(
                r.ownerName ?? "—",
                formatShortDay(r.dueOn),
                r.expectedProof,
              )}
            </p>
            {r.liftRefusalNote && r.status === "open" && (
              <p className="text-[length:var(--type-body-sm)] text-[color:var(--text-secondary)]">
                {t.liftRefusedLine(r.liftRefusalNote)}
              </p>
            )}
            {r.status !== "open" && r.liftRequestedAt && (
              <p className="text-[length:var(--type-body-sm)] text-[color:var(--text-secondary)]">
                {t.liftAsked(
                  r.liftRequestedBy,
                  formatShortInstant(r.liftRequestedAt),
                )}
                {r.liftNote ? ` : « ${r.liftNote} »` : ""}
                {r.liftProofUrl && (
                  <>
                    {" · "}
                    <a
                      href={r.liftProofUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="underline underline-offset-2"
                    >
                      {t.proofLink}
                    </a>
                  </>
                )}
                {r.liftProof ? ` · ${r.liftProof.name}` : ""}
              </p>
            )}
            {r.status === "lifted" && r.liftedAt && (
              <p className="text-[length:var(--type-body-sm)] text-[color:var(--text-secondary)]">
                {t.liftedLine(r.liftedBy, formatShortInstant(r.liftedAt))}
              </p>
            )}
            {r.canRequest && (
              <RequestLift
                projectId={projectId}
                organizationId={organizationId}
                reserveId={r.id}
              />
            )}
            {r.canDecide && (
              <DecideLift projectId={projectId} reserveId={r.id} />
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
