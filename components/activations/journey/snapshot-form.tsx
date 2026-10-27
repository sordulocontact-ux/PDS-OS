"use client";

import { useState } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { OptionSelect } from "@/components/projects/option-select";
import { Button } from "@/components/ui/button";
import { CheckboxField } from "@/components/ui/checkbox-field";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { recordSnapshot } from "@/lib/activations/trunk-actions";
import { fr } from "@/lib/i18n/fr";

const t = fr.activationJourney.snapshot;
const e = fr.activationJourney.errors;

type Source = keyof typeof t.sources;

/**
 * « Nouveau relevé » (proto snapForm): the figure in the activation's unit,
 * its platform, its period, its source, partial or unavailable. A snapshot
 * is declared; another person verifies it; snapshots are never summed.
 * `onCancel`: shown when it was opened by « Ajouter un relevé ».
 */
export function SnapshotForm({
  projectId,
  activationId,
  unit,
  measure,
  defaultSource = "internal",
  onCancel,
}: {
  projectId: string;
  activationId: string;
  // « vues », « retombées »…
  unit: string;
  // Where the figure is read, by lever (lib/activations/measure-sources.ts).
  measure: { label: string; platforms: string[] };
  defaultSource?: Source;
  onCancel?: () => void;
}) {
  const [missing, setMissing] = useState<"value" | "period" | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const { pending, error, run } = useWriteSubmit(() => {
    onCancel?.();
  }, "");
  return (
    <form
      noValidate
      className="flex flex-col gap-3 rounded-xl bg-[var(--surface-soft)] p-3.5"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const value = String(data.get("value") ?? "").trim();
        const from = String(data.get("from") ?? "");
        const to = String(data.get("to") ?? "");
        const gap = unavailable
          ? null
          : !value
            ? "value"
            : !from || !to
              ? "period"
              : null;
        setMissing(gap);
        if (gap) return;
        run(() =>
          recordSnapshot({
            projectId,
            activationId,
            value,
            platform: String(data.get("platform") ?? ""),
            from,
            to,
            source: String(data.get("source") ?? "internal") as Source,
            partial: data.get("partial") === "on",
            unavailable,
          }),
        );
      }}
    >
      <h3 className="text-[length:var(--type-body-sm)] font-semibold">
        {t.title}
      </h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          name="value"
          inputMode="numeric"
          label={unit.charAt(0).toUpperCase() + unit.slice(1)}
          required={!unavailable}
          error={missing === "value" ? e.value : undefined}
        />
        <OptionSelect
          name="platform"
          label={measure.label}
          items={Object.fromEntries(measure.platforms.map((p) => [p, p]))}
          defaultValue={measure.platforms[0]}
        />
        <fieldset className="flex flex-col gap-1.5">
          <legend className="sr-only">{t.period}</legend>
          <div className="grid grid-cols-2 gap-2">
            <Field
              name="from"
              type="date"
              label={`${t.period} · ${t.from}`}
              required={!unavailable}
              error={missing === "period" ? e.period : undefined}
            />
            <Field name="to" type="date" label={t.to} required={!unavailable} />
          </div>
        </fieldset>
        <OptionSelect
          name="source"
          label={t.source}
          items={t.sources}
          defaultValue={defaultSource}
        />
      </div>
      <CheckboxField name="partial" label={t.partial} />
      <CheckboxField
        label={t.unavailable}
        checked={unavailable}
        onChange={setUnavailable}
      />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {t.save}
        </Button>
        {onCancel && (
          <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
            {t.cancel}
          </Button>
        )}
      </div>
      {error && <FormMessage kind="error">{error}</FormMessage>}
    </form>
  );
}
