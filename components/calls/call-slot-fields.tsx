"use client";

import { FieldError } from "@/components/auth/form-message";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { moveStart, slotMinutes, type SlotInput } from "@/lib/calls/slot";
import { fr } from "@/lib/i18n/fr";

export type SlotErrors = Partial<Record<keyof SlotInput, string>>;

/**
 * When the call takes place, as in Teams: a day, from one time to another,
 * its length said next to it (computed by code). Moving the start moves the
 * end with it, keeping the length.
 */
export function CallSlotFields({
  idPrefix,
  slot,
  onChange,
  errors,
}: {
  idPrefix: string;
  slot: SlotInput;
  onChange: (slot: SlotInput) => void;
  errors: SlotErrors;
}) {
  const t = fr.calls.schedule;
  const minutes = slotMinutes(slot);
  const field = (key: keyof SlotInput) => ({
    id: `${idPrefix}-${key}`,
    required: true,
    "aria-invalid": errors[key] ? true : undefined,
    "aria-describedby": errors[key] ? `${idPrefix}-${key}-error` : undefined,
  });
  const messages = (["date", "start", "end"] as const).flatMap((key) =>
    errors[key] ? [{ key, text: errors[key] }] : [],
  );

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-end gap-x-3 gap-y-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${idPrefix}-date`} required>
            {t.fieldDate}
          </Label>
          <Input
            {...field("date")}
            type="date"
            value={slot.date}
            onChange={(e) => onChange({ ...slot, date: e.target.value })}
            className="h-10 w-fit text-base md:text-sm"
          />
        </div>
        <div className="flex items-end gap-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${idPrefix}-start`} required>
              {t.fieldStart}
            </Label>
            <Input
              {...field("start")}
              type="time"
              step={300}
              value={slot.start}
              onChange={(e) => onChange(moveStart(slot, e.target.value))}
              className="h-10 w-fit text-base tabular-nums md:text-sm"
            />
          </div>
          <span aria-hidden className="pb-2.5 text-sm text-muted-foreground">
            {t.to}
          </span>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${idPrefix}-end`} required>
              {t.fieldEnd}
            </Label>
            <Input
              {...field("end")}
              type="time"
              step={300}
              value={slot.end}
              onChange={(e) => onChange({ ...slot, end: e.target.value })}
              className="h-10 w-fit text-base tabular-nums md:text-sm"
            />
          </div>
        </div>
        {minutes !== null && (
          <span className="pb-2.5 text-sm text-muted-foreground tabular-nums">
            {t.duration(minutes)}
          </span>
        )}
      </div>
      {messages.map((message) => (
        <FieldError key={message.key} id={`${idPrefix}-${message.key}-error`}>
          {message.text}
        </FieldError>
      ))}
    </div>
  );
}
