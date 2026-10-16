import { buttonVariants } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { ViewLink } from "@/components/ui/view-link";
import { fr } from "@/lib/i18n/fr";
import { type JourneyStep, nowOf } from "@/lib/ui/journey";

const t = fr.journey;

/**
 * « Maintenant » (docs/VISION-UX.md § 4): what the viewer has to do in this
 * module, why, and the way to it; else who it waits for. Computed by code for
 * the person looking. It never repeats the step shown below: when `shownKey`
 * is the viewer's own step it is left out, the card disappears if nothing else
 * is theirs, and otherwise reads « Aussi à vous ».
 */
export function NowCard({
  steps,
  viewerName,
  shownKey,
  labels,
}: {
  steps: JourneyStep[];
  viewerName: string | null;
  shownKey?: string;
  labels?: { waitingTitle: string; finished: string };
}) {
  const all = nowOf(steps);
  const mine = shownKey ? all.mine.filter((s) => s.key !== shownKey) : all.mine;
  const waiting = all.waiting;
  const also = mine.length < all.mine.length;
  if (also && mine.length === 0) return null;
  const href = (s: JourneyStep) => s.href;
  const [first, ...more] = mine;
  const texts = labels ?? {
    waitingTitle: t.now.waitingTitle,
    finished: t.now.finished,
  };
  return (
    <section
      aria-label={t.now.label}
      className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-elevation-2"
    >
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <StatusBadge size="sm" tone={first ? "info" : "neutral"}>
          {first ? (also ? t.now.alsoMine : t.now.mine) : t.now.nothing}
        </StatusBadge>
        <span>{[viewerName, first?.title].filter(Boolean).join(" · ")}</span>
      </div>
      {first ? (
        <>
          <h2 className="text-display-sm font-medium text-balance">
            {first.actor?.todo}
          </h2>
          <p className="text-sm text-muted-foreground">{first.why}</p>
          <div className="flex flex-wrap items-center gap-3">
            <ViewLink href={href(first)} className={buttonVariants()}>
              {t.now.open}
            </ViewLink>
            {more.length > 0 && (
              <span className="text-sm text-muted-foreground">
                {t.now.others(
                  more.length,
                  more.map((s) => s.actor?.todo.toLowerCase()).join(" · "),
                )}
              </span>
            )}
          </div>
        </>
      ) : (
        <h2 className="text-display-sm font-medium text-balance">
          {waiting.length > 0 ? texts.waitingTitle : texts.finished}
        </h2>
      )}
      {waiting.length > 0 && (
        <ul className="flex flex-col gap-2">
          {waiting.slice(0, first ? 2 : 3).map((s) => (
            <li
              key={s.key}
              className="flex items-center gap-3 rounded-lg bg-[var(--surface-soft)] px-3 py-2.5 text-sm"
            >
              <span className="min-w-0 flex-1">
                {t.now.waitFor(s.actor?.name ?? "—")}
                {s.actor?.viaLink && (
                  <span className="text-muted-foreground"> ({t.viaLink})</span>
                )}
                {" : "}
                {s.actor?.todo.toLowerCase()}
              </span>
              <ViewLink
                href={href(s)}
                className={buttonVariants({ variant: "ghost", size: "sm" })}
              >
                {t.now.see}
              </ViewLink>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
