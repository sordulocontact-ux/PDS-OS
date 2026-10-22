import { StatusBadge } from "@/components/ui/status-badge";
import { fr } from "@/lib/i18n/fr";
import {
  formatTimecode,
  type MixComment,
} from "@/lib/master-workflow/mix-types";
import { formatShortInstant } from "@/lib/utils/day";

const t = fr.masterRound;

/**
 * The team's feedback on one version (rule 21, lot 7 of Ibé's feedback):
 * each with its timecode, its words and who said it when, marked
 * « Interne » — never what the engineer received (SentRequest).
 */
export function VersionComments({
  comments,
  engineer,
  title,
}: {
  comments: MixComment[];
  engineer: string;
  // « Retours sur le Mix V1 » under the latest version; « Retours de
  // l'équipe » inside an older one.
  title?: string;
}) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <h4 className="text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)] font-semibold">
          {title ?? t.chain.internal}
        </h4>
        <StatusBadge tone="neutral" size="sm">
          {t.chain.internalBadge}
        </StatusBadge>
        <span className="text-[length:var(--type-caption)] text-[color:var(--text-secondary)]">
          {t.chain.internalHint(engineer)}
        </span>
      </div>
      {comments.length === 0 ? (
        <p className="text-[length:var(--type-body-sm)] text-[color:var(--text-secondary)]">
          {t.feedback.empty}
        </p>
      ) : (
        <ul className="flex flex-col overflow-hidden rounded-xl border border-[color:var(--border-hairline)]">
          {comments.map((c) => (
            <li
              key={c.id}
              className="grid grid-cols-[3.5rem_minmax(0,1fr)] gap-x-3 gap-y-0.5 border-b border-[color:var(--border-hairline)] px-3.5 py-2.5 last:border-b-0"
            >
              <span className="text-[length:var(--type-body-sm)] font-semibold tabular-nums">
                {c.timecodeSeconds !== null
                  ? formatTimecode(c.timecodeSeconds)
                  : "—"}
              </span>
              <span className="text-[length:var(--type-body-sm)] break-words">
                « {c.body} »
              </span>
              <span className="col-start-2 text-[length:var(--type-caption)] text-[color:var(--text-secondary)]">
                {t.feedback.by(c.author, formatShortInstant(c.createdAt))}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
