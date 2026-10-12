"use client";

import { useState } from "react";

import { labelClass } from "@/components/ui/option-class";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FilterChip } from "@/components/ui/filter-chip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fr } from "@/lib/i18n/fr";
import type { ObjectiveInput } from "@/lib/strategy/actions/objectives";
import {
  KPI_KINDS,
  KPI_METRICS,
  kpiTracking,
  type KpiKind,
  type KpiMetric,
} from "@/lib/strategy/kpis";

/**
 * A KPI, typed by a person: quantitative (what is measured, the target —
 * to set later if unknown —, its metric and unit, by when, measured from
 * Deezer after the release only when it counts fans: MKT-S1-03) or
 * qualitative (the signal looked for, no figure). The caller remounts it (key) to empty it once saved.
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
  const t = fr.strategyKpis;
  const [kind, setKind] = useState<KpiKind>(initial?.kind ?? "quantitative");
  const [label, setLabel] = useState(initial?.label ?? "");
  const [target, setTarget] = useState(initial?.target ?? "");
  const [unit, setUnit] = useState(initial?.unit ?? "");
  const [dueOn, setDueOn] = useState(initial?.dueOn ?? "");
  const [metric, setMetric] = useState<KpiMetric>(initial?.metric ?? "other");
  const [measured, setMeasured] = useState(initial?.source === "deezer_fans");
  const quantitative = kind === "quantitative";
  // Deezer measures the artist's fans, nothing else.
  const measurable = metric === "fans";
  const id = (field: string) => `${idPrefix}-${field}`;

  return (
    <form
      className="grid gap-4 sm:grid-cols-3"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({
          kind,
          label,
          target: quantitative ? target : "",
          unit: quantitative ? unit : "",
          metric,
          source:
            quantitative && measurable && measured ? "deezer_fans" : "manual",
          dueOn,
        });
      }}
    >
      <div
        role="group"
        aria-label={t.kind}
        className="flex flex-wrap gap-1.5 sm:col-span-3"
      >
        {KPI_KINDS.map((k) => (
          <FilterChip
            key={k}
            variant="soft"
            pressed={kind === k}
            onClick={() => setKind(k)}
          >
            {t.kinds[k]}
          </FilterChip>
        ))}
      </div>
      <div className="flex flex-col gap-2 sm:col-span-3">
        <Label htmlFor={id("label")} required className={labelClass}>
          {t.label[kind]}
        </Label>
        <Input
          id={id("label")}
          aria-required
          maxLength={200}
          value={label}
          placeholder={t.labelPlaceholder[kind]}
          onChange={(e) => setLabel(e.target.value)}
        />
      </div>
      {quantitative && (
        <>
          <div
            role="group"
            aria-label={t.metric}
            className="flex flex-col gap-2 sm:col-span-3"
          >
            <span className={labelClass}>{t.metric}</span>
            <div className="flex flex-wrap gap-1.5">
              {KPI_METRICS.map((m) => (
                <FilterChip
                  key={m}
                  variant="soft"
                  pressed={metric === m}
                  onClick={() => setMetric(m)}
                >
                  {t.metrics[m]}
                </FilterChip>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={id("target")} className={labelClass}>
              {t.target}
            </Label>
            <Input
              id={id("target")}
              inputMode="decimal"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="tabular-nums"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={id("unit")} className={labelClass}>
              {t.unit}
            </Label>
            <Input
              id={id("unit")}
              maxLength={40}
              value={unit}
              placeholder={t.unitPlaceholders[metric]}
              onChange={(e) => setUnit(e.target.value)}
            />
          </div>
        </>
      )}
      <div className="flex flex-col gap-2">
        <Label htmlFor={id("due")} className={labelClass}>
          {t.dueOn}
        </Label>
        <Input
          id={id("due")}
          type="date"
          value={dueOn}
          onChange={(e) => setDueOn(e.target.value)}
          className="w-fit"
        />
      </div>
      {quantitative && measurable && (
        <label className="flex items-start gap-3 text-body-md sm:col-span-3">
          <Checkbox
            className="mt-1"
            checked={measured}
            onChange={(e) => setMeasured(e.target.checked)}
          />
          <span>{t.source}</span>
        </label>
      )}
      {quantitative && kpiTracking(metric, "manual") === "to_connect" && (
        <p className="text-caption text-muted-foreground sm:col-span-3">
          {t.noSource}
        </p>
      )}
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
