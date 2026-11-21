"use client";

import { useState } from "react";

import { EmptyNote } from "@/components/shell/empty-state";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { ChipChoice } from "@/components/ui/chip-choice";
import { ToneCallout } from "@/components/ui/tone-callout";
import type { FreeDay, FreeSlot } from "@/lib/calendar/free-slots";
import type { CallNegotiator } from "@/lib/deals/negotiation-call";
import { todayInParis } from "@/lib/insights/dates";
import { monthOf } from "@/lib/utils/date-input";
import { dealCalls } from "@/lib/i18n/fr/deal-calls";

const fr = { dealCalls };

const longDay = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});
const capitalize = (text: string) =>
  text.charAt(0).toUpperCase() + text.slice(1);

/** As in Calendly (Sacha 21/11/2026): the month on the left, only the days
 * with a free slot to choose (the first chosen), then that day's hours in a
 * column on the right; on a phone, one under the other. */
function DaySlots({
  days,
  onPick,
}: {
  days: FreeDay[];
  onPick: (slot: FreeSlot) => void;
}) {
  const t = fr.dealCalls.negotiation;
  const [chosen, setChosen] = useState(days[0].day);
  const [month, setMonth] = useState(monthOf(days[0].day));
  const free = new Set(days.map((d) => d.day));
  const day = days.find((d) => d.day === chosen) ?? days[0];
  const title = capitalize(longDay.format(new Date(`${day.day}T00:00:00Z`)));
  return (
    <div className="grid gap-4 sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-6">
      <div className="w-fit rounded-xl border border-[color:var(--border-hairline)]">
        <Calendar
          value={day.day}
          today={todayInParis()}
          month={month}
          onMonthChange={setMonth}
          onSelect={setChosen}
          available={(d) => free.has(d)}
        />
      </div>
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
          ) : negotiator.days.length === 0 ? (
            <EmptyNote>{t.slotsNone}</EmptyNote>
          ) : (
            <DaySlots
              key={negotiator.id}
              days={negotiator.days}
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
