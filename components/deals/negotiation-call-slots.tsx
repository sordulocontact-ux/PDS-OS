"use client";

import { useState, useTransition } from "react";

import { EmptyNote } from "@/components/shell/empty-state";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { ChipChoice } from "@/components/ui/chip-choice";
import { Skeleton } from "@/components/ui/skeleton";
import { ToneCallout } from "@/components/ui/tone-callout";
import type { FreeDay, FreeSlot } from "@/lib/calendar/free-slots";
import type { CallNegotiator } from "@/lib/deals/negotiation-call";
import { negotiatorFreeMonth } from "@/lib/deals/negotiation-call-actions";
import { todayInParis } from "@/lib/insights/dates";
import { addMonths, monthOf } from "@/lib/utils/date-input";
import { dealCalls } from "@/lib/i18n/fr/deal-calls";

const fr = { dealCalls };

const longDay = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});
// The same day, `years` later (29/02 → 28/02).
const addYears = (day: string, years: number) => addMonths(day, 12 * years);
const capitalize = (text: string) =>
  text.charAt(0).toUpperCase() + text.slice(1);

/** As in Calendly (Sacha 21/11/2026): the month on the left, only the days
 * with a free slot to choose (the first of the month chosen), then that
 * day's hours in a column on the right; on a phone, one under the other.
 * Up to five years ahead: a month not yet read is read when shown
 * (negotiatorFreeMonth). */
function DaySlots({
  personId,
  initial,
  onPick,
}: {
  personId: string;
  // This month and the next, read by the server.
  initial: FreeDay[];
  onPick: (slot: FreeSlot) => void;
}) {
  const t = fr.dealCalls.negotiation;
  const today = todayInParis();
  const [days, setDays] = useState(initial);
  const [read, setRead] = useState(
    () => new Set([monthOf(today), addMonths(monthOf(today), 1)]),
  );
  const [failed, setFailed] = useState(false);
  const [chosen, setChosen] = useState<string | null>(initial[0]?.day ?? null);
  const [month, setMonth] = useState(monthOf(initial[0]?.day ?? today));
  const [pending, startTransition] = useTransition();

  const show = (next: string) => {
    setMonth(next);
    setFailed(false);
    if (read.has(next) || next < monthOf(today)) return;
    startTransition(async () => {
      const result = await negotiatorFreeMonth(personId, next);
      if (result.error) return setFailed(true);
      setRead((r) => new Set(r).add(next));
      setDays((all) => [
        ...all.filter((d) => monthOf(d.day) !== next),
        ...result.days,
      ]);
    });
  };

  const free = new Set(days.map((d) => d.day));
  const inMonth = days.filter((d) => monthOf(d.day) === month);
  // The day clicked, else the first free day of the month shown.
  const day = inMonth.find((d) => d.day === chosen) ?? inMonth[0] ?? null;
  const title = day
    ? capitalize(longDay.format(new Date(`${day.day}T00:00:00Z`)))
    : "";
  const loading = pending || !read.has(month);
  return (
    <div className="grid gap-4 sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-6">
      <div className="w-fit rounded-xl border border-[color:var(--border-hairline)]">
        <Calendar
          value={day?.day ?? ""}
          today={today}
          min={today}
          max={addYears(today, 5)}
          month={month}
          onMonthChange={show}
          onSelect={setChosen}
          available={(d) => free.has(d)}
        />
      </div>
      {failed ? (
        <ToneCallout tone="warning">{t.slotsError}</ToneCallout>
      ) : loading && !day ? (
        <div aria-busy className="flex flex-col gap-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-9" />
          <Skeleton className="h-9" />
          <Skeleton className="h-9" />
        </div>
      ) : !day ? (
        <EmptyNote>{t.slotsNone}</EmptyNote>
      ) : (
        <section
          aria-label={t.slotsOf(title)}
          className="flex min-w-0 flex-col gap-3"
        >
          <h4 className="text-body-md font-semibold">{title}</h4>
          <ul className="flex flex-col gap-2">
            {day.slots.map((slot) => (
              <li key={slot.local}>
                <Button
                  type="button"
                  variant="outline"
                  aria-label={t.slot(day.label, slot.label)}
                  onClick={() => onPick(slot)}
                  className="w-full tabular-nums"
                >
                  {slot.label}
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/**
 * The first step of « Caler le call »: who holds it (when the deal has no
 * negotiator yet), then his free slots as in Calendly (DaySlots), each
 * a button that opens the call form on it; « Autre horaire » opens it empty.
 */
export function NegotiationCallSlots({
  negotiators,
  fixed,
  who,
  onWho,
  onPick,
}: {
  negotiators: CallNegotiator[];
  fixed: boolean;
  who: string | null;
  onWho: (id: string | null) => void;
  onPick: (slot: FreeSlot | "other") => void;
}) {
  const t = fr.dealCalls.negotiation;
  if (negotiators.length === 0) return <EmptyNote>{t.noNegotiator}</EmptyNote>;
  const negotiator = negotiators.find((n) => n.id === who) ?? null;
  return (
    <div className="flex flex-col gap-6">
      {!fixed && negotiators.length > 1 && (
        <ChipChoice
          name="negotiator"
          legend={t.who}
          required
          options={negotiators.map((n) => ({ value: n.id, label: n.name }))}
          value={who}
          onChange={onWho}
        />
      )}
      {negotiator && (
        <section
          aria-label={t.slotsTitle(negotiator.name)}
          className="flex flex-col gap-4"
        >
          {negotiator.error ? (
            <ToneCallout tone="warning">{t.slotsError}</ToneCallout>
          ) : (
            <DaySlots
              key={negotiator.id}
              personId={negotiator.id}
              initial={negotiator.days}
              onPick={onPick}
            />
          )}
          <div>
            <Button
              type="button"
              variant="outline"
              onClick={() => onPick("other")}
            >
              {t.other}
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
