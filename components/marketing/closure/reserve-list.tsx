import { ReserveMenu } from "@/components/marketing/closure/reserve-menu";
import { EmptyNote } from "@/components/shell/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatBriefDate } from "@/lib/framing/assess";
import { fr } from "@/lib/i18n/fr";
import { reserveStateKey } from "@/lib/marketing/closure/reserves";
import type { Reserve } from "@/lib/marketing/reserves/queries";
import { formatLongDay } from "@/lib/project-history/format";
import { marketingReserveTone } from "@/lib/ui/state-tones";

const t = fr.marketingReview.closure.reserves;
const categories = fr.marketingReview.reports.reserveCategories;

/**
 * Every reserve of the Marketing with its arbitration: what was decided,
 * by whom, the follow-up (who, by when, channel, news, task), the lifting.
 * Lifted and closed reserves stay listed: nothing leaves the history.
 */
export function ReserveList({
  projectId,
  reserves,
  activationTitle,
  viewer,
  members,
  tasks,
}: {
  projectId: string;
  reserves: Reserve[];
  activationTitle: (id: string) => string | null;
  viewer: {
    personId: string | null;
    owner: boolean;
    direction: boolean;
    // Closed: arbitrations are frozen, follow-ups go on.
    closed: boolean;
  };
  members: { personId: string; name: string }[];
  tasks: { id: string; title: string }[];
}) {
  if (reserves.length === 0) return <EmptyNote>{t.empty}</EmptyNote>;
  const descriptionOf = (id: string | null) =>
    reserves.find((r) => r.id === id)?.description ?? "";
  return (
    <ul className="grid gap-3">
      {reserves.map((r) => {
        const key = reserveStateKey(r.status, r.decision);
        const activation = r.activationId
          ? activationTitle(r.activationId)
          : null;
        const lines = [
          r.decision === "follow_up" &&
            t.followUpLine(
              r.followUp.name,
              r.followUp.dueOn && formatBriefDate(r.followUp.dueOn),
              r.followUp.channel,
            ),
          r.followUp.note && t.noteLine(r.followUp.note),
          r.reason && t.reasonLine(r.reason),
          r.duplicateOf && t.duplicateLine(descriptionOf(r.duplicateOf)),
          r.task && t.taskLine(r.task.title, r.task.done),
          r.arbitrated &&
            t.arbitratedBy(r.arbitrated.by, formatLongDay(r.arbitrated.at)),
          r.lifted && t.liftedBy(r.lifted.by, formatLongDay(r.lifted.at)),
          r.lifted?.note,
        ].filter(
          (line): line is string => typeof line === "string" && line !== "",
        );
        return (
          <li
            key={r.id}
            className="flex items-start gap-3 rounded-lg border border-border p-4"
          >
            <div className="grid min-w-0 flex-1 gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-caption text-muted-foreground">
                  {[categories[r.category], activation]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
                <StatusBadge tone={marketingReserveTone[key]} size="sm">
                  {t.states[key as keyof typeof t.states]}
                </StatusBadge>
              </div>
              <p className="font-medium break-words">{r.description}</p>
              {lines.map((line, i) => (
                <p
                  key={i}
                  className="text-sm break-words text-muted-foreground"
                >
                  {line}
                </p>
              ))}
            </div>
            <ReserveMenu
              projectId={projectId}
              reserve={{
                id: r.id,
                description: r.description,
                status: r.status,
                decision: r.decision,
                reason: r.reason,
                followUp: r.followUp,
                taskId: r.task?.id ?? null,
              }}
              role={{
                owner: viewer.owner,
                direction: viewer.direction,
                closed: viewer.closed,
                follower:
                  viewer.personId !== null &&
                  viewer.personId === r.followUp.personId,
              }}
              members={members}
              others={reserves
                .filter((o) => o.id !== r.id && o.decision !== "duplicate")
                .map((o) => ({ id: o.id, label: o.description }))}
              tasks={tasks}
            />
          </li>
        );
      })}
    </ul>
  );
}
