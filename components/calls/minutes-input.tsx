"use client";

import { useState } from "react";

import { Input } from "@/components/ui/input";
import { TOPIC_MINUTES_MAX, TOPIC_MINUTES_MIN } from "@/lib/calls/prepare";
import { calls } from "@/lib/i18n/fr/calls";

const fr = { calls };

/**
 * The time given to a topic of the agenda, in minutes, typed in place.
 * Emptied while typing, it comes back to the last valid value on leaving.
 * The number is in the text colour (it is editable), only « min » is muted.
 */
export function MinutesInput({
  topic,
  value,
  onChange,
}: {
  topic: string;
  value: number;
  onChange: (minutes: number) => void;
}) {
  const t = fr.calls.prepare;
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <span className="flex shrink-0 items-center gap-1.5 text-body-md">
      <Input
        type="number"
        inputMode="numeric"
        min={TOPIC_MINUTES_MIN}
        max={TOPIC_MINUTES_MAX}
        step={1}
        aria-label={t.minutesLabel(topic)}
        value={draft ?? String(value)}
        onChange={(e) => {
          setDraft(e.target.value);
          const n = Number(e.target.value);
          if (
            Number.isInteger(n) &&
            n >= TOPIC_MINUTES_MIN &&
            n <= TOPIC_MINUTES_MAX
          )
            onChange(n);
        }}
        onBlur={() => setDraft(null)}
        className="h-8 w-16 text-right font-medium text-foreground tabular-nums"
      />
      <span className="text-muted-foreground">{t.minutesUnit}</span>
    </span>
  );
}
