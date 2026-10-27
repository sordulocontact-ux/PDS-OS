"use client";

import { useState } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { useFramingAction } from "@/components/framing/use-framing-action";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { strategyCalendar } from "@/lib/i18n/fr/strategy-calendar";
import { setUpstreamLeadDays } from "@/lib/strategy/actions/upstream";
import {
  UPSTREAM_LEAD_DAYS,
  UPSTREAM_STEPS,
  type UpstreamStepKey,
} from "@/lib/strategy/upstream";

const fr = { strategyCalendar };

/**
 * « Ajuster les délais » of one deliverable (MKT-S1-04): days before its
 * milestone for each upstream step, empty = the default; the deadlines are
 * then counted again by code.
 */
export function LeadDaysForm({
  projectId,
  deliverableId,
  current,
  onDone,
}: {
  projectId: string;
  deliverableId: string;
  // The deliverable's own lead times; null where it uses the default.
  current: Record<UpstreamStepKey, number | null>;
  onDone: () => void;
}) {
  const t = fr.strategyCalendar.upstream.arbitrate;
  const steps = fr.strategyCalendar.upstream.steps;
  const { pending, run, error } = useFramingAction({ inline: true });
  const [orderError, setOrderError] = useState(false);

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const value = (key: UpstreamStepKey) =>
          String(data.get(key) ?? "").trim();
        const days = (key: UpstreamStepKey) =>
          value(key) === "" ? UPSTREAM_LEAD_DAYS[key] : Number(value(key));
        // Conception ends before production, production before validation.
        const ordered =
          days("conception") >= days("production") &&
          days("production") >= days("validation");
        setOrderError(!ordered);
        if (!ordered) return;
        run(
          () =>
            setUpstreamLeadDays(projectId, deliverableId, {
              conception: value("conception"),
              production: value("production"),
              validation: value("validation"),
            }),
          onDone,
        );
      }}
    >
      {UPSTREAM_STEPS.map((key) => (
        <Field
          key={key}
          name={key}
          label={steps[key]}
          hint={t.defaultHint(UPSTREAM_LEAD_DAYS[key])}
          suffix={t.daysSuffix}
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={3}
          defaultValue={current[key] === null ? "" : String(current[key])}
          className="tabular-nums"
        />
      ))}
      {orderError && <FormMessage kind="error">{t.orderError}</FormMessage>}
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <DialogFormActions
        pending={pending}
        submitLabel={t.saveLeads}
        onCancel={onDone}
      />
    </form>
  );
}
