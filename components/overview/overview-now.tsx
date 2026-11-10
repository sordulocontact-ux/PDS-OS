import { ContentCard } from "@/components/shell/content-card";
import { buttonVariants, ButtonRoll } from "@/components/ui/button";
import { ViewLink } from "@/components/ui/view-link";
import { journey } from "@/lib/i18n/fr/journey";
import { projectShell } from "@/lib/i18n/fr/project-shell";
import type { NowItem } from "@/components/shell/journey/now-card";
import { actionHref, lowerFirst } from "@/lib/ui/journey";
import { formatShortDay } from "@/lib/utils/day";

const fr = { journey, projectShell };

const caption =
  "text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)] text-[color:var(--text-secondary)]";

/**
 * « Maintenant » of the overview (retour d'Akili du 05/11/2026, proto
 * validated 10/11): one small title, then the viewer's first action in big
 * (where it is, its why) and the only primary button of the page; the next
 * one named as « Aussi à vous ». Nothing for the viewer: who is awaited, on
 * what, with the way to it. Every action read from the journeys
 * (loadShellJourneys), the Cadrage's before the plan, everyone's after.
 */
export function OverviewNow({
  mine,
  waiting,
}: {
  mine: NowItem[];
  waiting: NowItem[];
}) {
  const t = fr.projectShell.overview.now;
  const [first, ...more] = mine;
  const awaited = first ? null : waiting[0];
  const place = (item: NowItem) =>
    [item.place, item.step.title].filter(Boolean).join(" › ");
  const where = first ?? awaited;

  return (
    <ContentCard title={t.label} quietTitle className="gap-5 p-6">
      <div className="flex flex-col gap-2">
        {where && (
          <p className={caption}>
            {[
              place(where),
              first?.step.due
                ? fr.journey.now.due(
                    formatShortDay(first.step.due, { bare: true }),
                  )
                : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        )}
        <h3 className="text-[length:var(--type-display-md)] leading-[var(--type-display-md-lh)] font-semibold tracking-[var(--type-display-tracking)] text-balance">
          {first ? first.step.actor?.todo : awaited ? t.nothing : t.allDone}
        </h3>
        {first?.step.why && (
          <p className="max-w-prose text-[length:var(--type-body-md)] leading-[var(--type-body-md-lh)] text-pretty text-[color:var(--text-secondary)]">
            {first.step.why}
          </p>
        )}
        {awaited?.step.actor && (
          <p className="text-[length:var(--type-body-md)] leading-[var(--type-body-md-lh)] text-[color:var(--text-secondary)]">
            {fr.journey.now.waitingOfName(awaited.step.actor.name)}
            <b className="font-semibold text-[color:var(--text-primary)]">
              {awaited.step.actor.name}
            </b>
            {fr.journey.now.waitingOn(lowerFirst(awaited.step.actor.todo))}.
          </p>
        )}
      </div>
      {first ? (
        <div className="flex flex-col items-start gap-3">
          <ViewLink
            href={actionHref(first.step)}
            className={buttonVariants({ size: "lg" })}
          >
            <ButtonRoll>{t.open}</ButtonRoll>
          </ViewLink>
          {more.length > 0 && (
            <p className={caption}>
              {t.also}{" "}
              <ViewLink
                href={actionHref(more[0].step)}
                className="font-medium text-[color:var(--text-primary)] underline underline-offset-2"
              >
                {`${lowerFirst(more[0].step.actor?.todo ?? more[0].step.title)} (${more[0].place ?? more[0].step.title})`}
              </ViewLink>
              {more.length > 1 && ` ${t.more(more.length - 1)}`}
            </p>
          )}
        </div>
      ) : (
        awaited && (
          <div>
            <ViewLink
              href={awaited.step.href}
              className={buttonVariants({ variant: "outline" })}
            >
              <ButtonRoll>{t.open}</ButtonRoll>
            </ViewLink>
          </div>
        )
      )}
    </ContentCard>
  );
}
