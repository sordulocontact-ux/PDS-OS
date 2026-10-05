"use client";

import { useState } from "react";

import { Field } from "@/components/auth/field";
import { FieldError } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { fr } from "@/lib/i18n/fr";
import type { BriefDate } from "@/lib/master-workflow/brief-types";
import { proposeMasterCalendar } from "@/lib/master-workflow/calendar";
import { formatShortDate } from "@/lib/release/format";

const STEPS = ["mixV1Due", "mixFinalDue", "masteringDue"] as const;

/**
 * The calendar of the Brief: the master final's date first, then the three
 * steps before it. The code proposes their dates from the master final
 * (ticket § 5); a person applies them with one click or types others.
 */
export function BriefCalendarFields({
  initial,
  error,
}: {
  initial: Record<BriefDate, string | null>;
  error?: string;
}) {
  const t = fr.masterWorkflow.brief;
  const [dates, setDates] = useState(() => ({
    mixV1Due: initial.mixV1Due ?? "",
    mixFinalDue: initial.mixFinalDue ?? "",
    masteringDue: initial.masteringDue ?? "",
    masterFinalDue: initial.masterFinalDue ?? "",
  }));
  const proposal = proposeMasterCalendar(dates.masterFinalDue || null);
  const set =
    (field: BriefDate) => (event: React.ChangeEvent<HTMLInputElement>) =>
      setDates((current) => ({ ...current, [field]: event.target.value }));

  return (
    <div className="flex flex-col gap-5">
      <Field
        name="masterFinalDue"
        type="date"
        label={t.fields.masterFinalDue}
        hint={t.fields.masterFinalHint}
        value={dates.masterFinalDue}
        onChange={set("masterFinalDue")}
      />
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-[color:var(--text-secondary)]">
          {proposal
            ? t.proposal(
                STEPS.map(
                  (step) =>
                    `${t.fields[step]} ${formatShortDate(proposal[step])}`,
                ).join(", "),
              )
            : t.noProposal}
        </p>
        {proposal && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setDates((current) => ({ ...current, ...proposal }))}
          >
            {t.applyProposal}
          </Button>
        )}
      </div>
      <div className="grid gap-5 sm:grid-cols-3">
        {STEPS.map((step) => (
          <Field
            key={step}
            name={step}
            type="date"
            label={t.fields[step]}
            value={dates[step]}
            onChange={set(step)}
            aria-describedby={error ? "brief-calendar-error" : undefined}
          />
        ))}
      </div>
      <FieldError id="brief-calendar-error">{error}</FieldError>
    </div>
  );
}
