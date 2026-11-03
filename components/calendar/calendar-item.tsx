import { ViewLink } from "@/components/ui/view-link";
import type { CalendarItem } from "@/lib/calendar/items";
import { calendar } from "@/lib/i18n/fr/calendar";
import { hueClass, projectHue } from "@/lib/ui/category-hues";
import { cn } from "@/lib/utils";
import { clock } from "@/lib/utils/calendar-period";

const fr = { calendar };

const t = fr.calendar.page;

const longDay = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

/** « samedi 5 décembre », a day of the grid. */
export const longDayOf = (day: string) =>
  longDay.format(new Date(`${day}T00:00:00Z`));

/** Read by a screen reader: what, which project, when, whose. */
function itemLabel(item: CalendarItem): string {
  return [
    item.minute !== null ? `${clock(item.minute)} ${item.label}` : item.label,
    item.projectTitle,
    longDayOf(item.day),
    item.overdue ? t.overdue : item.mine ? t.mine : null,
  ]
    .filter(Boolean)
    .join(", ");
}

/** A dot before an item that asks the viewer something: blue, red when late. */
function MineDot({ item }: { item: CalendarItem }) {
  if (!item.mine && !item.overdue) return null;
  return (
    <span
      aria-hidden
      className={cn(
        "mt-[0.45em] size-1.5 shrink-0 rounded-[var(--radius-circle)]",
        item.overdue ? "bg-error" : "bg-selection",
      )}
    />
  );
}

/**
 * One date of the Calendrier, on its project's hue (the same as in the
 * Calls), opening where it is decided. `compact`: one truncated line in a
 * month's cell; otherwise the label wraps and the project goes below (the
 * week's hours, agenda). A release stands out in semibold; a past day is quieter.
 */
export function CalendarEntry({
  item,
  past,
  compact = false,
  className,
}: {
  item: CalendarItem;
  past: boolean;
  compact?: boolean;
  // Its place in a grid (the week's hours: the slot's whole height).
  className?: string;
}) {
  const time = item.minute !== null ? clock(item.minute) : null;
  return (
    <ViewLink
      href={item.href}
      aria-label={itemLabel(item)}
      className={cn(
        hueClass[projectHue(item.projectId)],
        "flex min-w-0 gap-1.5 rounded-md px-1.5 py-0.5 text-[length:var(--type-micro)] leading-[var(--type-micro-lh)] font-medium no-underline transition-shadow duration-150 ease-out focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none [@media(hover:hover)]:hover:shadow-elevation-1",
        !compact && "py-1",
        past && "opacity-70",
        className,
      )}
    >
      <MineDot item={item} />
      <span className={cn("min-w-0", compact ? "truncate" : "break-words")}>
        {time && <span className="tabular-nums">{time} </span>}
        <span className={cn(item.kind === "release" && "font-semibold")}>
          {item.label}
        </span>
        {item.projectTitle &&
          (compact ? (
            <span> · {item.projectTitle}</span>
          ) : (
            <span className="block opacity-80">{item.projectTitle}</span>
          ))}
      </span>
    </ViewLink>
  );
}
