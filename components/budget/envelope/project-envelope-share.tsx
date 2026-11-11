import { ViewLink } from "@/components/ui/view-link";
import { ToneCallout } from "@/components/ui/tone-callout";
import { routes } from "@/lib/auth/redirects";
import type { ProjectEnvelopeShare as Share } from "@/lib/budget/envelope-queries";
import { formatEuros } from "@/lib/budget/types";
import { artistBudget } from "@/lib/i18n/fr/artist-budget";
import { envelopeTone } from "@/lib/ui/state-tones";

const fr = { artistBudget };

/**
 * On a project's Budget (BUD 2): the part of its artist's open envelope the
 * project takes, what the artist spent in all and what remains; computed
 * by the database, said here. Nothing when the artist has no envelope.
 */
export function ProjectEnvelopeShare({ share }: { share: Share | null }) {
  if (!share) return null;
  const t = fr.artistBudget.share;
  const rest = share.amountCents - share.totalSpentCents;
  return (
    <ToneCallout
      as="div"
      tone={rest < 0 ? envelopeTone.over : envelopeTone.within}
      contentClassName="flex flex-wrap items-center gap-x-3 gap-y-1"
    >
      <span className="font-semibold">{t.label(share.artistName)}</span>
      <span className="tabular-nums">
        {t.body(
          formatEuros(share.projectSpentCents),
          formatEuros(share.totalSpentCents),
          formatEuros(share.amountCents),
        )}
        {" · "}
        {rest < 0 ? t.overrun(formatEuros(-rest)) : t.rest(formatEuros(rest))}
      </span>
      <ViewLink
        href={routes.artistBudget(share.artistId)}
        className="underline underline-offset-4"
      >
        {t.open}
      </ViewLink>
    </ToneCallout>
  );
}
