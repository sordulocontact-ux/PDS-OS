"use client";

import { EmptyNote } from "@/components/shell/empty-state";
import { Button } from "@/components/ui/button";
import { ChipChoice } from "@/components/ui/chip-choice";
import { ToneCallout } from "@/components/ui/tone-callout";
import type { FreeSlot } from "@/lib/calendar/free-slots";
import type { CallNegotiator } from "@/lib/deals/negotiation-call";
import { dealCalls } from "@/lib/i18n/fr/deal-calls";

const fr = { dealCalls };

const secondary = "text-body-sm text-[color:var(--text-secondary)]";

/**
 * The first step of « Caler le call »: who holds it (when the deal has no
 * negotiator yet), then his free slots, day by day, each a button that
 * opens the call form on it; « Autre horaire » opens it empty.
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
        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h3 className="text-body-md font-semibold">
              {t.slotsTitle(negotiator.name)}
            </h3>
            <p className={secondary}>{t.slotsSource}</p>
          </div>
          {negotiator.error ? (
            <ToneCallout tone="warning">{t.slotsError}</ToneCallout>
          ) : negotiator.days.length === 0 ? (
            <EmptyNote>{t.slotsNone}</EmptyNote>
          ) : (
            <ul className="flex flex-col gap-3">
              {negotiator.days.map((day) => (
                <li key={day.day} className="flex flex-col gap-1.5">
                  <span className="text-body-sm font-semibold">
                    {day.label}
                  </span>
                  <span className="flex flex-wrap gap-2">
                    {day.slots.map((slot) => (
                      <Button
                        key={slot.local}
                        type="button"
                        variant="outline"
                        size="sm"
                        aria-label={t.slot(day.label, slot.label)}
                        onClick={() => onPick(slot)}
                        className="tabular-nums"
                      >
                        {slot.label}
                      </Button>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
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
