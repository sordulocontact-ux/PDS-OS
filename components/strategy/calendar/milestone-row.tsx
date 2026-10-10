import { optionClass } from "@/components/strategy/option-class";
import { StatusBadge } from "@/components/ui/status-badge";
import { fr } from "@/lib/i18n/fr";
import { dayOffset, isMilestoneChannel } from "@/lib/strategy/calendar";
import type { Milestone } from "@/lib/strategy/queries";
import { cn } from "@/lib/utils";

const dateFormat = new Intl.DateTimeFormat("fr-FR", {
  weekday: "short",
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});
export const formatMilestoneDate = (date: string) =>
  dateFormat.format(new Date(`${date}T00:00:00Z`));

type Kind = keyof typeof fr.strategy.calendar.kinds;

/**
 * One milestone: its day relative to the release (code), title, kind,
 * channel, date, linked deliverable and note. A button that opens it when
 * the owner can edit; plain text otherwise.
 */
export function MilestoneRow({
  milestone: m,
  referenceDate,
  deliverableTitle,
  showChannel = true,
  onOpen,
}: {
  milestone: Milestone;
  referenceDate: string | null;
  deliverableTitle: string | null;
  // The channel view already groups by channel.
  showChannel?: boolean;
  onOpen?: () => void;
}) {
  const t = fr.strategy.calendar;
  const c = fr.strategyCalendar;
  const body = (
    <>
      <span className="pt-0.5 text-caption font-semibold text-muted-foreground tabular-nums">
        {referenceDate
          ? t.dayOffset(dayOffset(m.occurs_on, referenceDate))
          : c.noDate}
      </span>
      <span className="flex min-w-0 flex-col gap-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-semibold break-words">{m.title}</span>
          <StatusBadge tone="neutral" size="sm">
            {t.kinds[m.kind as Kind] ?? m.kind}
          </StatusBadge>
        </span>
        <span className="text-caption text-muted-foreground">
          {[
            formatMilestoneDate(m.occurs_on),
            showChannel &&
              isMilestoneChannel(m.channel) &&
              c.channels[m.channel],
            deliverableTitle,
          ]
            .filter(Boolean)
            .join(" · ")}
        </span>
        {m.notes && (
          <span className="text-caption whitespace-pre-wrap text-foreground">
            {m.notes}
          </span>
        )}
      </span>
    </>
  );
  const className = cn(
    optionClass(false),
    "grid w-full grid-cols-[4rem_minmax(0,1fr)]",
  );
  return onOpen ? (
    <button
      type="button"
      className={className}
      aria-label={c.open(m.title)}
      onClick={onOpen}
    >
      {body}
    </button>
  ) : (
    <div className={className}>{body}</div>
  );
}
