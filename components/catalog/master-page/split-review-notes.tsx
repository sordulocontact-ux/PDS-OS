import { Timestamp } from "@/components/ui/timestamp";
import { ToneCallout } from "@/components/ui/tone-callout";
import { formatShare } from "@/lib/catalog/master/rules";
import type {
  SplitGap,
  SplitReviewState,
  SplitValidation,
} from "@/lib/catalog/master/split-review";
import { masterPage } from "@/lib/i18n/fr/master-page";

const fr = { masterPage };

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
