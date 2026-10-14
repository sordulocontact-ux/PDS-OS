import Link from "next/link";

import { ProgressBar } from "@/components/ui/progress-bar";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";

// Share of the day left before a member is warned: 20 % of the limit.
const NEARLY_REACHED = 0.8;

// Today's requests to PO, as Claude's usage page shows them: the share used,
// a bar, the count, when it starts again, and who sets the limit.
export function AiUsageMeter({
  used,
  limit,
  setsOwnLimit,
}: {
  used: number;
  limit: number;
  // The general director changes the limits (their own too) in Équipe.
  setsOwnLimit: boolean;
}) {
  const t = fr.aiUsage.settings.usage;
  const reached = used >= limit;
  const percent =
    limit > 0 ? Math.min(100, Math.floor((used / limit) * 100)) : 100;
  const left = Math.max(0, limit - used);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-4">
          <span className="font-medium">{t.today}</span>
          <span
            className={cn(
              "text-sm text-muted-foreground tabular-nums",
              reached && "text-error",
            )}
          >
            {t.percent(percent)}
          </span>
        </div>
        <ProgressBar
          value={used}
          max={limit}
          label={t.barLabel(used, limit)}
          tone={reached ? "error" : "ink"}
        />
        <p className="text-sm text-muted-foreground">
          <span className="tabular-nums">{t.count(used, limit)}</span>
          {" · "}
          {t.resets}
        </p>
      </div>

      {reached ? (
        <p role="status" className="text-sm font-medium text-error">
          {t.reached}
        </p>
      ) : (
        used >= limit * NEARLY_REACHED && (
          <p role="status" className="text-sm font-medium">
            {t.nearlyReached(left)}
          </p>
        )
      )}

      <p className="border-t border-border pt-4 text-sm text-muted-foreground">
        {t.limit(limit)}{" "}
        {setsOwnLimit ? (
          <>
            {t.ownLimit}{" "}
            <Link
              href={routes.members}
              className="font-medium text-foreground underline underline-offset-4"
            >
              {t.teamLink}
            </Link>
            .
          </>
        ) : (
          t.askDirector
        )}
      </p>
    </div>
  );
}
