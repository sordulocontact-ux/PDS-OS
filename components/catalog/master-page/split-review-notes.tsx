import { Timestamp } from "@/components/ui/timestamp";
import { ToneCallout } from "@/components/ui/tone-callout";
import { formatShare } from "@/lib/catalog/master/rules";
import type {
  SplitGap,
  SplitReviewState,
  SplitValidation,
} from "@/lib/catalog/master/split-review";
import type { SplitEvent } from "@/lib/catalog/master/split-queries";
import { fr } from "@/lib/i18n/fr";

const t = fr.masterPage.splits;

/** The validated version, said when it is no longer the current lines
 * (retour 48), or who validated the current ones. */
export function SplitValidationNote({
  state,
  validation,
}: {
  state: SplitReviewState;
  validation: SplitValidation | null;
}) {
  if (!validation) return null;
  if (state === "validated")
    return (
      <p className="text-sm text-[color:var(--text-secondary)]">
        {t.review.validatedBy(validation.validatorName)}{" "}
        <Timestamp iso={validation.validatedAt} />
      </p>
    );
  return (
    <ToneCallout tone="warning">
      {t.review.changedNote(validation.validatorName)}{" "}
      {validation.lines
        .map((line) => `${line.party} ${formatShare(line.share)}`)
        .join(" · ")}{" "}
      (<Timestamp iso={validation.validatedAt} />)
    </ToneCallout>
  );
}

/** Credited creative roles without a publishing share (retour 52). */
export function SplitGapsNote({ gaps }: { gaps: SplitGap[] }) {
  if (gaps.length === 0) return null;
  const roles = fr.masterPage.credits.roles as Record<string, string>;
  return (
    <ToneCallout tone="info">
      <span className="font-medium">{t.gaps.title}</span>
      {" · "}
      {gaps
        .map((gap) =>
          t.gaps.line(
            gap.name,
            gap.roles.map((r) => (roles[r] ?? r).toLowerCase()).join(", "),
          ),
        )
        .join(" ")}{" "}
      {t.gaps.note}
    </ToneCallout>
  );
}

/** Every change of a split, newest first (retour 47). */
export function SplitHistory({ events }: { events: SplitEvent[] }) {
  if (events.length === 0) return null;
  const h = t.history;
  const sentence = (e: SplitEvent) => {
    if (e.action === "validated") return h.validated;
    if (e.action === "added" && e.after)
      return h.added(e.after.party, formatShare(e.after.share));
    if (e.action === "removed" && e.before)
      return h.removed(e.before.party, formatShare(e.before.share));
    if (e.before && e.after)
      return h.updated(
        `${e.before.party} ${formatShare(e.before.share)}`,
        `${e.after.party} ${formatShare(e.after.share)}`,
      );
    return null;
  };
  return (
    <details>
      <summary className="cursor-pointer text-sm font-medium text-[color:var(--text-secondary)] select-none">
        {h.title(events.length)}
      </summary>
      <ul className="mt-2 flex flex-col gap-1 text-sm">
        {events.map((e) => (
          <li key={e.id} className="flex flex-wrap gap-x-2">
            <Timestamp
              iso={e.createdAt}
              className="text-[color:var(--text-tertiary)] tabular-nums"
            />
            <span>
              {sentence(e)}
              {h.by(e.actorName)}
            </span>
          </li>
        ))}
      </ul>
    </details>
  );
}
