import type { ReactNode } from "react";

import { core } from "@/lib/i18n/fr/core";
import { cn } from "@/lib/utils";
import { formatDay } from "@/lib/utils/day";
import { dueGap } from "@/lib/utils/due";
import { todayInParis } from "@/lib/insights/dates";

const t = core.dueDate;

/**
 * A due day still awaited, said in words and colour (docs/STYLE-FINANCE-
 * PARTOUT.md § 6.3): late = red « 26 jours de retard », within
 * `DUE_SOON_DAYS` = orange « Dans 4 jours » / « Demain » / « Aujourd'hui »,
 * further = `fallback` (the short date the cell already shows) in ink. The
 * words carry the meaning, the colour only backs them up. `awaited` false
 * (paid, signed, cancelled…) = `fallback`, no colour. The full date is in
 * the `title`.
 *
 * Client tables pass `today` (their page's Paris day) so server and client
 * agree; without it, today in Paris is read here (server components).
 */
export function DueDate({
  dueOn,
  awaited,
  fallback,
  today,
  showDate = false,
  className,
}: {
  dueOn: string;
  awaited: boolean;
  fallback: ReactNode;
  today?: string;
  // Words and then the date, for a sheet: « 3 jours de retard · Lun. 16/11/2026 ».
  showDate?: boolean;
  className?: string;
}) {
  const full = formatDay(dueOn);
  const gap = awaited ? dueGap(dueOn, today ?? todayInParis()) : null;
  const words =
    gap?.kind === "late"
      ? t.late(gap.days)
      : gap?.kind === "today"
        ? t.today
        : gap?.kind === "tomorrow"
          ? t.tomorrow
          : gap?.kind === "soon"
            ? t.ahead(gap.days)
            : null;
  const tone =
    gap?.kind === "late"
      ? "text-[color:var(--tone-danger-fg)]"
      : words
        ? "text-[color:var(--tone-warning-fg)]"
        : null;
  return (
    <time
      dateTime={dueOn}
      title={full}
      suppressHydrationWarning
      // The figures' typeface (Geist Mono, every .tabular-nums) for a date
      // only: words (« 13 jours de retard ») keep the text's (Sacha
      // 24/11/2026).
      className={cn(!words && "tabular-nums", tone, className)}
    >
      {words ? (
        <>
          {words}
          {showDate && (
            <span className="text-[color:var(--text-secondary)]">
              {" · "}
              <span className="tabular-nums">{fallback}</span>
            </span>
          )}
        </>
      ) : (
        fallback
      )}
    </time>
  );
}
