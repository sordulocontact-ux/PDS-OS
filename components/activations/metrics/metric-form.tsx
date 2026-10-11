"use client";

import { useState } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { OptionSelect } from "@/components/projects/option-select";
import { Button } from "@/components/ui/button";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import {
  METRIC_SOURCES,
  METRIC_UNITS,
  METRICS,
  type Metric,
  type MetricSource,
  type MetricUnit,
} from "@/lib/activations/model";
import { recordMetric } from "@/lib/activations/proof-actions";
import type { ActivationScope } from "@/lib/activations/types";
import { fr } from "@/lib/i18n/fr";

const t = fr.activations.metrics;

/** « Noter un relevé » : a metric, its value and unit, the period it covers,
 * where it was read and when. Recorded as declared. */
export function MetricForm({
  scope,
  targetId = null,
  agencyRowId = null,
  defaultSource = "internal",
  today,
  onDone,
}: {
  scope: ActivationScope;
  targetId?: string | null;
  agencyRowId?: string | null;
  defaultSource?: MetricSource;
  today: string;
  onDone: () => void;
}) {
  const [metric, setMetric] = useState<Metric>("views");
  const [errors, setErrors] = useState<{ value?: string; label?: string }>({});
  const { pending, error, run } = useWriteSubmit(onDone, t.recorded);

  function submit(form: HTMLFormElement) {
    const data = new FormData(form);
    const raw = String(data.get("value") ?? "")
      .replace(/\s/g, "")
      .replace(",", ".");
    const value = Number(raw);
    const label = String(data.get("label") ?? "").trim();
    const next = {
      value:
        raw === "" || !Number.isFinite(value) || value < 0
          ? fr.activations.errors.valueRequired
          : undefined,
      label:
        metric === "other" && !label
          ? fr.activations.errors.labelRequired
          : undefined,
    };
    setErrors(next);
    if (next.value || next.label) return;
    run(() =>
      recordMetric({
        projectId: scope.projectId,
        activationId: scope.activationId,
        targetId,
        agencyRowId,
        metric,
        label,
        value,
        unit: String(data.get("unit")) as MetricUnit,
        platform: String(data.get("platform") ?? ""),
        periodStart: String(data.get("periodStart") ?? ""),
        periodEnd: String(data.get("periodEnd") ?? ""),
        source: String(data.get("source")) as MetricSource,
        method: String(data.get("method") ?? ""),
        collectedOn: String(data.get("collectedOn") || today),
      }),
    );
  }

  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        submit(event.currentTarget);
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <OptionSelect
          name="metric"
          label={t.metric}
          required
          items={Object.fromEntries(METRICS.map((m) => [m, t.names[m]]))}
          defaultValue={metric}
          onValueChange={(v) => setMetric(v as Metric)}
        />
        {metric === "other" && (
          <Field
            name="label"
            label={t.label}
            required
            maxLength={80}
            error={errors.label}
          />
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          name="value"
          label={t.value}
          required
          inputMode="decimal"
          error={errors.value}
        />
        <OptionSelect
          name="unit"
          label={t.unit}
          required
          items={Object.fromEntries(METRIC_UNITS.map((u) => [u, t.units[u]]))}
          defaultValue={metric === "engagement_rate" ? "percent" : "count"}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="periodStart" type="date" label={t.periodStart} />
        <Field name="periodEnd" type="date" label={t.periodEnd} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <OptionSelect
          name="source"
          label={t.source}
          required
          items={Object.fromEntries(
            METRIC_SOURCES.map((s) => [s, t.sources[s]]),
          )}
          defaultValue={defaultSource}
        />
        <Field
          name="collectedOn"
          type="date"
          label={t.collectedOn}
          required
          defaultValue={today}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="platform" label={t.platform} maxLength={60} />
        <Field name="method" label={t.method} maxLength={300} />
      </div>
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" size="lg" onClick={onDone}>
          {fr.activations.cancel}
        </Button>
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? fr.activations.saving : t.record}
        </Button>
      </div>
    </form>
  );
}
