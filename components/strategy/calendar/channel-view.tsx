import { MilestoneRow } from "@/components/strategy/calendar/milestone-row";
import { EmptyNote } from "@/components/shell/empty-state";
import { strategyCalendar } from "@/lib/i18n/fr/strategy-calendar";
import {
  MILESTONE_CHANNELS,
  type MilestoneChannel,
} from "@/lib/strategy/calendar";
import type { Milestone } from "@/lib/strategy/queries";

const fr = { strategyCalendar };

// Always shown, even empty: the channels every launch weighs. Live / Event
// and Autre appear only when they hold a milestone (« lorsque nécessaire »).
const ALWAYS: readonly MilestoneChannel[] = [
  "organic",
  "influence",
  "press",
  "release",
];

/** The same milestones, grouped by channel, in date order inside each. */
export function ChannelView({
  milestones,
  referenceDate,
  deliverableTitle,
  onOpen,
}: {
  milestones: Milestone[];
  referenceDate: string | null;
  deliverableTitle: (id: string | null) => string | null;
  onOpen?: (milestone: Milestone) => void;
}) {
  const c = fr.strategyCalendar;
  const groups = MILESTONE_CHANNELS.map((channel) => ({
    channel,
    items: milestones.filter((m) => m.channel === channel),
  })).filter((g) => ALWAYS.includes(g.channel) || g.items.length > 0);

  return (
    <div className="flex flex-col gap-8">
      {groups.map((g) => (
        <section
          key={g.channel}
          aria-labelledby={`channel-${g.channel}`}
          className="flex flex-col gap-3"
        >
          <h4
            id={`channel-${g.channel}`}
            className="text-body-md font-semibold text-foreground"
          >
            {c.channels[g.channel]}
          </h4>
          {g.items.length === 0 ? (
            <EmptyNote>{c.channelEmpty}</EmptyNote>
          ) : (
            <ol className="flex flex-col gap-3">
              {g.items.map((m) => (
                <li key={m.id}>
                  <MilestoneRow
                    milestone={m}
                    referenceDate={referenceDate}
                    deliverableTitle={deliverableTitle(m.deliverable_id)}
                    showChannel={false}
                    onOpen={onOpen && (() => onOpen(m))}
                  />
                </li>
              ))}
            </ol>
          )}
        </section>
      ))}
    </div>
  );
}
