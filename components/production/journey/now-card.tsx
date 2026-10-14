import { buttonVariants } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { ViewLink } from "@/components/ui/view-link";
import { fr } from "@/lib/i18n/fr";
import { stepHref } from "@/lib/production/journey/href";
import { nowOf } from "@/lib/production/journey/steps";
import type { JourneyStep } from "@/lib/production/journey/types";

const t = fr.productionJourney;

/**
 * « Maintenant » (Ibé, 14/10): what the viewer has to do on this production,
 * why, and the way to it; else who the production waits for. Computed by code
 * for the person looking (lib/production/journey).
 */
export function NowCard({
  projectId,
  deliverableId,
  steps,
  viewerName,
}: {
  projectId: string;
  deliverableId: string;
  steps: JourneyStep[];
  viewerName: string | null;
}) {
  const { mine, waiting } = nowOf(steps);
  const href = (s: JourneyStep) => stepHref(projectId, deliverableId, s.key);
  const [first, ...more] = mine;
  return (
    <section
      aria-label={t.now.label}
      className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-elevation-2"
    >
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <StatusBadge size="sm" tone={first ? "info" : "neutral"}>
          {first ? t.now.mine : t.now.nothing}
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
          {waiting.length > 0 ? t.now.waitingTitle : t.now.finished}
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
