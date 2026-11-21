"use client";

import { useState, useTransition } from "react";

import { FieldError } from "@/components/auth/form-message";
import {
  CallSlotFields,
  type SlotErrors,
} from "@/components/calls/call-slot-fields";
import { EmptyNote } from "@/components/shell/empty-state";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Skeleton } from "@/components/ui/skeleton";
import { ToneCallout } from "@/components/ui/tone-callout";
import type { FreeDay, FreeSlot } from "@/lib/calendar/free-slots";
import type { SlotInput } from "@/lib/calls/slot";
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
function FreeSlotPicker({
  personId,
  initial,
  selected,
  onPick,
}: {
  personId: string;
  // This month and the next, read by the server.
  initial: FreeDay[];
  // The slot picked ("YYYY-MM-DDTHH:mm"), shown pressed.
  selected: string | null;
  onPick: (slot: FreeSlot) => void;
}) {
  const t = fr.dealCalls.negotiation;
  const today = todayInParis();
  const [days, setDays] = useState(initial);
  const [read, setRead] = useState(
    () => new Set([monthOf(today), addMonths(monthOf(today), 1)]),
  );
  const [failed, setFailed] = useState(false);
  const first = selected?.slice(0, 10) ?? initial[0]?.day ?? null;
  const [chosen, setChosen] = useState<string | null>(first);
  const [month, setMonth] = useState(monthOf(first ?? today));
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
                  variant={slot.local === selected ? "default" : "outline"}
                  aria-pressed={slot.local === selected}
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
 * The slot of a deal's call, in the call form (Sacha 21/11/2026: « les
 * dispos direct ici »): the business manager's free slots as in Calendly in
 * place of the day and times; « Autre horaire » gives the fields back for a
 * slot of one's own. His slots unreadable: the fields, and why.
 */
export function DealSlotField({
  idPrefix,
  negotiator,
  slot,
  onChange,
  errors,
}: {
  idPrefix: string;
  negotiator: CallNegotiator;
  slot: SlotInput;
  onChange: (slot: SlotInput) => void;
  errors: SlotErrors;
}) {
  const t = fr.dealCalls.negotiation;
  const [manual, setManual] = useState(negotiator.error);
  const missing = errors.date ?? errors.start ?? errors.end;
  if (manual)
    return (
      <div className="flex flex-col gap-3">
        {negotiator.error && (
          <ToneCallout tone="warning">{t.slotsError}</ToneCallout>
        )}
        <CallSlotFields
          idPrefix={idPrefix}
          slot={slot}
          onChange={onChange}
          errors={errors}
        />
        {!negotiator.error && (
          <div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setManual(false)}
            >
              {t.back}
            </Button>
          </div>
        )}
      </div>
    );
  const selected =
    slot.date && slot.start ? `${slot.date}T${slot.start}` : null;
  return (
    <fieldset
      aria-label={t.slotsTitle(negotiator.name)}
      aria-invalid={missing ? true : undefined}
      tabIndex={-1}
      className="flex flex-col gap-3 outline-none"
    >
      <FreeSlotPicker
        personId={negotiator.id}
        initial={negotiator.days}
        selected={selected}
        onPick={(picked) =>
          onChange({
            date: picked.local.slice(0, 10),
            start: picked.local.slice(11),
            end: picked.end,
          })
        }
      />
      {missing && (
        <FieldError id={`${idPrefix}-slot-error`}>{t.slotMissing}</FieldError>
      )}
      <div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setManual(true)}
        >
          {t.other}
        </Button>
      </div>
    </fieldset>
  );
}
