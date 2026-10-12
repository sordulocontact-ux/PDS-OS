import { TransmissionActions } from "@/components/master-workflow/transmission-actions";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDateTime } from "@/lib/calls/format";
import { formatBriefDate } from "@/lib/framing/assess";
import { fr } from "@/lib/i18n/fr";
import {
  EXPIRY_WARNING_DAYS,
  daysLeft,
  transmissionState,
  type TransmissionRow,
} from "@/lib/master-workflow/transmission-types";
import { transmissionStateTone } from "@/lib/ui/state-tones";
import { cn } from "@/lib/utils";

/**
 * Each sending, newest first (PROJ-UX-09): to whom, by whom, its state
 * computed by code, then each step of the link's life apart and dated
 * (created, sent, opened, taken in charge, file received), its expiry said
 * before it surprises anyone, and, for the live link, the owner's moves.
 */
export function TransmissionHistory({
  rows,
  role,
  projectId,
  canEdit,
}: {
  rows: TransmissionRow[];
  role: "mix" | "mastering";
  projectId: string;
  canEdit: boolean;
}) {
  const t = fr.masterWorkflow.mix.history;
  const l = fr.masterWorkflow.mix.life;
  const now = new Date();
  return (
    <ol className="flex flex-col gap-4">
      {rows.map((row, index) => {
        const state = transmissionState(row, now);
        const live =
          state === "waiting" || state === "to_remind" || state === "received";
        const left = daysLeft(row.expiresAt, now);
        const steps: Array<[string, string | null, boolean]> = [
          [l.created, row.sentAt, true],
          [l.sent, row.linkSentAt, false],
          [l.opened, row.openedAt, true],
          [l.acknowledged, row.acknowledgedAt, true],
          [l.delivered, row.deliveredAt, true],
        ];
        return (
          <li
            key={row.id}
            className="flex flex-col gap-3 rounded-2xl border border-border p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium">
                  {t.sending(rows.length - index, row.engineer)}
                </p>
                <p className="text-caption text-[color:var(--text-secondary)]">
                  {formatDateTime(row.sentAt)}
                  {l.by(row.sentBy)}
                </p>
              </div>
              <StatusBadge tone={transmissionStateTone[state]}>
                {state === "received" && row.acknowledgedAt
                  ? t.states.received(formatDateTime(row.acknowledgedAt))
                  : state === "received"
                    ? t.states.waiting
                    : t.states[state]}
              </StatusBadge>
            </div>
            <ol
              className="grid gap-1 text-sm sm:grid-cols-5"
              aria-label={t.lifeLabel}
            >
              {steps.map(([label, at, auto]) => (
                <li key={label} className="flex flex-col">
                  <span
                    className={cn(!at && "text-[color:var(--text-secondary)]")}
                  >
                    {label}
                  </span>
                  <span className="text-caption text-[color:var(--text-secondary)]">
                    {at ? formatDateTime(at) : auto ? l.notYet : l.notSaid}
                  </span>
                </li>
              ))}
            </ol>
            {row.note && (
              <p className="text-sm whitespace-pre-wrap">{row.note}</p>
            )}
            {row.continued && <p className="text-caption">{l.continued}</p>}
            {row.withoutStems.length > 0 && (
              <p className="text-caption">{l.withoutStems(row.withoutStems)}</p>
            )}
            {row.revokeReason && (
              <p className="text-caption">{l.revoked(row.revokeReason)}</p>
            )}
            {(live || state === "expired") && !row.revokedAt && (
              <p
                className={cn(
                  "text-caption",
                  left <= EXPIRY_WARNING_DAYS
                    ? "text-[color:var(--tone-warning-fg)]"
                    : "text-[color:var(--text-secondary)]",
                )}
              >
                {l.expires(formatBriefDate(row.expiresAt.slice(0, 10)), left)}
              </p>
            )}
            {canEdit && live && !row.revokedAt && (
              <TransmissionActions
                projectId={projectId}
                id={row.id}
                role={role}
                sent={row.linkSentAt !== null}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
