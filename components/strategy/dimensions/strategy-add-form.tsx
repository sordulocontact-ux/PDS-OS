"use client";

import { useState } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { OptionSelect } from "@/components/framing/option-select";
import { Button } from "@/components/ui/button";
import { useCloseProposalAdd } from "@/components/ui/proposal-group";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { strategyDimensions } from "@/lib/i18n/fr/strategy-dimensions";
import { addStrategyLine } from "@/lib/strategy/actions/add-line";
import type { LeverOption } from "@/lib/strategy/dimension-levers";
import { parseRelativeDay } from "@/lib/strategy/calendar";
import type { StrategyDimension } from "@/lib/strategy/dimensions";

const fr = { strategyDimensions };

const t = fr.strategyDimensions;

/**
 * « Ajouter … » of a dimension, opened under its head (proto addForm):
 * the words (and the format, the day from the release, the amount), or the
 * lever to retain among those not retained. Each missing field turns red
 * with its reason at the first try; the line is kept at once.
 */
export function StrategyAddForm({
  projectId,
  dimension,
  leverOptions = [],
}: {
  projectId: string;
  dimension: StrategyDimension;
  leverOptions?: LeverOption[];
}) {
  const close = useCloseProposalAdd();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [lever, setLever] = useState(leverOptions[0]?.value ?? "other");
  const { pending, error, run } = useWriteSubmit(close, t.done.added);
  const id = (field: string) => `add-${dimension}-${field}`;

  function submit(form: FormData) {
    const text = String(form.get("text") ?? "").trim();
    const extra = String(form.get("extra") ?? "").trim();
    const missing: Record<string, string> = {};
    if (dimension !== "levers" && !text) missing.text = t.errors.text;
    if (dimension === "levers" && lever === "other" && !text)
      missing.text = t.errors.text;
    const day = dimension === "calendar" ? parseRelativeDay(extra) : null;
    if (dimension === "calendar" && day === null) missing.extra = t.errors.day;
    if (dimension === "budget" && !extra) missing.extra = t.errors.amount;
    setErrors(missing);
    const first = Object.keys(missing)[0];
    if (first) {
      document.getElementById(id(first))?.focus();
      return;
    }
    run(() =>
      addStrategyLine(
        projectId,
        dimension === "levers"
          ? { dimension, option: lever, other: text }
          : dimension === "deliverables"
            ? { dimension, text, format: extra }
            : dimension === "calendar"
              ? { dimension, text, day: day ?? 0 }
              : dimension === "budget"
                ? { dimension, text, amount: extra }
                : { dimension, text },
      ),
    );
  }

  const textLabel =
    dimension === "deliverables"
      ? t.fields.deliverable
      : dimension === "calendar"
        ? t.fields.milestone
        : dimension === "budget"
          ? t.fields.line
          : dimension === "levers"
            ? t.fields.otherLeverLabel
            : dimension === "objectives"
              ? t.fields.objective
              : t.names[dimension];
  const placeholder =
    dimension === "deliverables"
      ? t.fields.deliverablePlaceholder
      : dimension === "calendar"
        ? t.fields.milestonePlaceholder
        : dimension === "budget"
          ? t.fields.linePlaceholder
          : t.fields.decided;
  const extra =
    dimension === "deliverables"
      ? { label: t.fields.format, placeholder: t.fields.formatPlaceholder }
      : dimension === "calendar"
        ? { label: t.fields.day, placeholder: t.fields.dayPlaceholder }
        : dimension === "budget"
          ? { label: t.fields.amount, placeholder: t.fields.amountPlaceholder }
          : null;

  return (
    <form
      noValidate
      action={submit}
      className="flex flex-col gap-2.5 modern:gap-2"
      aria-busy={pending || undefined}
    >
      {dimension === "levers" && (
        <OptionSelect
          id={id("lever")}
          label={t.fields.lever}
          required
          options={Object.fromEntries([
            ...leverOptions.map((o) => [o.value, o.label]),
            ["other", t.fields.otherLever],
          ])}
          value={lever}
          onChange={setLever}
        />
      )}
      <div className="grid gap-2.5 sm:grid-cols-2 modern:gap-2">
        {(dimension !== "levers" || lever === "other") && (
          <Field
            id={id("text")}
            name="text"
            label={textLabel}
            placeholder={placeholder}
            required
            autoFocus
            error={errors.text}
          />
        )}
        {extra && (
          <Field
            id={id("extra")}
            name="extra"
            label={extra.label}
            placeholder={extra.placeholder}
            required={dimension !== "deliverables"}
            inputMode={dimension === "deliverables" ? undefined : "decimal"}
            error={errors.extra}
          />
        )}
      </div>
      <FormMessage kind="error">{error}</FormMessage>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {t.addButton}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={close}>
          {t.cancel}
        </Button>
      </div>
    </form>
  );
}
