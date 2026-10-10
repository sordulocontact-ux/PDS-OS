"use client";

import { useState } from "react";

import { labelClass } from "@/components/strategy/option-class";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fr } from "@/lib/i18n/fr";
import type { ObjectiveInput } from "@/lib/strategy/actions/objectives";

/**
 * An objective and its figure, typed by a person: what is measured, the
 * target (to set later if unknown), its unit and by when. The caller
 * remounts it (key) to empty it once saved.
 */
export function ObjectiveForm({
  idPrefix,
  initial,
  pending,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  idPrefix: string;
  initial?: ObjectiveInput;
  pending: boolean;
  submitLabel: string;
  onSubmit: (input: ObjectiveInput) => void;
  onCancel?: () => void;
}) {
  const t = fr.strategyPilot.objectives;
  const [label, setLabel] = useState(initial?.label ?? "");
  const [target, setTarget] = useState(initial?.target ?? "");
  const [unit, setUnit] = useState(initial?.unit ?? "");
  const [dueOn, setDueOn] = useState(initial?.dueOn ?? "");

  return (
    <form
      className="grid gap-4 sm:grid-cols-3"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({ label, target, unit, dueOn });
      }}
    >
      <div className="flex flex-col gap-2 sm:col-span-3">
        <Label htmlFor={`${idPrefix}-label`} required className={labelClass}>
          {t.label}
        </Label>
        <Input
          id={`${idPrefix}-label`}
          aria-required
          maxLength={200}
          value={label}
          placeholder={t.labelPlaceholder}
          onChange={(e) => setLabel(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${idPrefix}-target`} className={labelClass}>
          {t.target}
        </Label>
        <Input
          id={`${idPrefix}-target`}
          inputMode="decimal"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          className="tabular-nums"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${idPrefix}-unit`} className={labelClass}>
          {t.unit}
        </Label>
        <Input
          id={`${idPrefix}-unit`}
          maxLength={40}
          value={unit}
          placeholder={t.unitPlaceholder}
          onChange={(e) => setUnit(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${idPrefix}-due`} className={labelClass}>
          {t.dueOn}
        </Label>
        <Input
          id={`${idPrefix}-due`}
          type="date"
          value={dueOn}
          onChange={(e) => setDueOn(e.target.value)}
        />
      </div>
      <div className="flex flex-wrap gap-2 sm:col-span-3">
        <Button
          type="submit"
          variant={initial ? "default" : "outline"}
          disabled={pending || label.trim() === ""}
        >
          {submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            {t.cancel}
          </Button>
        )}
      </div>
    </form>
  );
}
