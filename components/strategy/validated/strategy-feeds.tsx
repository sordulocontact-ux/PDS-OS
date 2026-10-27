import { buttonVariants } from "@/components/ui/button";
import { Rows } from "@/components/ui/rows";
import { ViewLink } from "@/components/ui/view-link";
import { routes } from "@/lib/auth/redirects";
import { strategyBriefOut } from "@/lib/i18n/fr/strategy-brief-out";
import type { BriefOut } from "@/lib/strategy/brief-out";
import { formatDay } from "@/lib/utils/day";

const fr = { strategyBriefOut };

const t = fr.strategyBriefOut.final;

function Feed({
  title,
  count,
  detail,
  href,
}: {
  title: string;
  count?: string;
  detail: string;
  // The proto opens the Conception and the Activations; the Planning is
  // said, not opened.
  href?: string;
}) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-x-3.5 gap-y-2 px-3.5 py-3 text-body-sm">
      <span className="flex min-w-0 flex-[1_1_18rem] flex-col">
        <span>
          <b className="font-semibold">{title}</b>
          {count && ` · ${count}`}
        </span>
        <span className="text-caption text-[color:var(--text-tertiary)]">
          {detail}
        </span>
      </span>
      {href && (
        <ViewLink
          href={href}
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          {t.open}
        </ViewLink>
      )}
    </li>
  );
}

/**
 * « Ce que la Stratégie alimente » (proto st4, ticket § 10): the
 * Conception (the deliverables to conceive), the Activations (the levers
 * retained to prepare), the Planning (milestones and upstream deadlines) —
 * three equal consequences, none to start now; then the follow-up (§ 14).
 */
export function StrategyFeeds({
  projectId,
  out,
  upstream,
  referenceDate,
}: {
  projectId: string;
  out: BriefOut;
  upstream: number;
  referenceDate: string | null;
}) {
  return (
    <section className="flex flex-col gap-2" aria-labelledby="strategy-feeds">
      <h3 id="strategy-feeds" className="text-body-md font-semibold">
        {t.feeds}
      </h3>
      <Rows label={t.feeds}>
        <Feed
          title={t.design}
          count={t.designCount(out.deliverables.length)}
          detail={out.deliverables.join(", ") || "—"}
          href={routes.projectDesign(projectId)}
        />
        <Feed
          title={t.activations}
          count={t.activationsCount(out.levers.length)}
          detail={out.levers.join(", ") || "—"}
          href={routes.projectActivations(projectId)}
        />
        <Feed
          title={t.planning}
          count={t.planningCount(out.when.length, upstream)}
          detail={
            referenceDate ? t.planningFrom(formatDay(referenceDate)) : "—"
          }
        />
        <Feed
          title={t.followUp}
          detail={t.followUpBody}
          href={routes.projectStrategyFollowUp(projectId)}
        />
      </Rows>
    </section>
  );
}
