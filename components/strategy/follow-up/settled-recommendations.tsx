import { StrategyPart } from "@/components/strategy/strategy-part";
import { Rows } from "@/components/ui/rows";
import { StatusBadge } from "@/components/ui/status-badge";
import { Timestamp } from "@/components/ui/timestamp";
import { ViewLink } from "@/components/ui/view-link";
import { routes } from "@/lib/auth/redirects";
import { formatBriefDate } from "@/lib/framing/assess";
import { strategyFollowUp } from "@/lib/i18n/fr/strategy-follow-up";
import type { SettledRecommendation } from "@/lib/strategy/settled-recommendations";
import { recommendationLevelTone } from "@/lib/ui/state-tones";

const fr = { strategyFollowUp };

/**
 * The recommendations already settled (MKT-C2-02), newest first: what each
 * said when it was settled, by whom and when, then its task as the Travail
 * shows it — or why it was ignored. Each is the anchor its task links to.
 */
export function SettledRecommendations({
  projectId,
  items,
}: {
  projectId: string;
  items: SettledRecommendation[];
}) {
  const t = fr.strategyFollowUp.recommendations;
  const s = t.settled;
  if (items.length === 0) return null;
  return (
    <StrategyPart id="settled-title" title={s.title}>
      <Rows label={s.title}>
        {items.map((item) => (
          <li
            key={item.id}
            id={`reco-${item.id}`}
            className="flex scroll-mt-6 flex-col gap-2 px-3.5 py-3"
          >
            <div className="flex flex-wrap items-center gap-2 text-caption text-muted-foreground">
              {item.level && (
                <StatusBadge
                  tone={recommendationLevelTone[item.level]}
                  size="sm"
                >
                  {t.levels[item.level]}
                </StatusBadge>
              )}
              <span className="font-medium text-foreground">
                {item.state === "applied" ? s.applied : s.ignored}
              </span>
              <span>
                {s.by(item.by)} <Timestamp iso={item.at} />
              </span>
            </div>
            <p className="text-body-md">{item.summary ?? s.noSummary}</p>
            {item.state === "ignored" ? (
              <p className="text-caption text-muted-foreground">
                {item.reason ? s.reason(item.reason) : s.noReason}
              </p>
            ) : item.task ? (
              <div className="flex flex-wrap items-center gap-2 text-caption text-muted-foreground">
                <StatusBadge
                  tone={item.task.done ? "success" : "info"}
                  size="sm"
                >
                  {item.task.done ? s.taskDone : s.taskOpen}
                </StatusBadge>
                <span className="min-w-0 break-words">
                  {s.taskLine(
                    item.task.title,
                    item.task.assignee,
                    item.task.dueOn ? formatBriefDate(item.task.dueOn) : null,
                  )}
                </span>
                <ViewLink
                  href={routes.projectWork(projectId)}
                  className="font-medium text-foreground underline underline-offset-2"
                >
                  {s.openWork}
                </ViewLink>
              </div>
            ) : (
              <p className="text-caption text-muted-foreground">{s.taskGone}</p>
            )}
          </li>
        ))}
      </Rows>
    </StrategyPart>
  );
}
