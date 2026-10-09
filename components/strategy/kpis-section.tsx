"use client";

import { useState } from "react";

import { OptionSelect } from "@/components/framing/option-select";
import { useFramingAction } from "@/components/framing/use-framing-action";
import { useCanEditProject } from "@/components/projects/edit-access";
import { labelClass, optionClass } from "@/components/strategy/option-class";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fr } from "@/lib/i18n/fr";
import { addKpi, removeKpi } from "@/lib/strategy/actions/dimensions";
import { kpiLine } from "@/lib/strategy/brief-snapshot";
import type { KpiMetric } from "@/lib/strategy/dimensions";
import type { StrategyData } from "@/lib/strategy/queries";

type Kind = "quantitative" | "qualitative";

/**
 * KPIs (ticket § 7): a few signals to judge the release by. Their real value
 * comes later, entered or read at the source (follow-up), never invented.
 */
export function KpisSection({
  kpis,
  projectId,
}: {
  kpis: StrategyData["kpis"];
  projectId: string;
}) {
  const t = fr.strategyFlow.objectives;
  const { pending, run } = useFramingAction();
  const canEdit = useCanEditProject();
  const [label, setLabel] = useState("");
  const [kind, setKind] = useState<Kind>("quantitative");
  const [target, setTarget] = useState("");
  const [unit, setUnit] = useState("");
  const [metric, setMetric] = useState<KpiMetric>("manual");

  return (
    <section aria-labelledby="kpis-title" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h3 id="kpis-title" className="text-body-lg font-semibold">
          {t.kpisTitle}
        </h3>
        <p className="text-caption text-muted-foreground">{t.kpisHint}</p>
      </div>
      {kpis.length === 0 ? (
        <p className="text-body-md text-muted-foreground">{t.empty}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {kpis.map((k) => (
            <li key={k.id} className={`${optionClass(false)} justify-between`}>
              <div className="flex min-w-0 flex-col gap-1">
                <span className="font-semibold break-words">{kpiLine(k)}</span>
                <span className="text-caption text-muted-foreground">
                  {t.kinds[k.kind as Kind]} · {t.metrics[k.metric as KpiMetric]}
                </span>
              </div>
              {canEdit && (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={pending}
                  aria-label={t.removeLabel(k.label)}
                  onClick={() => run(() => removeKpi(projectId, k.id))}
                >
                  {t.remove}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      {canEdit && (
        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            run(
              () =>
                addKpi(projectId, {
                  label,
                  kind,
                  target,
                  unit,
                  metric: kind === "quantitative" ? metric : "manual",
                }),
              () => {
                setLabel("");
                setTarget("");
                setUnit("");
              },
            );
          }}
        >
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="kpi-label" className={labelClass}>
              {t.label}
            </Label>
            <Input
              id="kpi-label"
              value={label}
              maxLength={200}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="kpi-kind" className={labelClass}>
              {t.kind}
            </Label>
            <OptionSelect
              id="kpi-kind"
              label={t.kind}
              options={t.kinds}
              value={kind}
              onChange={(v) => setKind(v as Kind)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="kpi-target" className={labelClass}>
              {t.target}
            </Label>
            <Input
              id="kpi-target"
              value={target}
              inputMode={kind === "quantitative" ? "decimal" : "text"}
              maxLength={300}
              onChange={(e) => setTarget(e.target.value)}
            />
          </div>
          {kind === "quantitative" && (
            <>
              <div className="flex flex-col gap-2">
                <Label htmlFor="kpi-unit" className={labelClass}>
                  {t.unit}
                </Label>
                <Input
                  id="kpi-unit"
                  value={unit}
                  maxLength={40}
                  onChange={(e) => setUnit(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="kpi-metric" className={labelClass}>
                  {t.metric}
                </Label>
                <OptionSelect
                  id="kpi-metric"
                  label={t.metric}
                  options={t.metrics}
                  value={metric}
                  onChange={(v) => setMetric(v as KpiMetric)}
                />
              </div>
            </>
          )}
          <Button
            type="submit"
            variant="outline"
            className="justify-self-start"
            disabled={pending || label.trim() === ""}
          >
            {t.add}
          </Button>
        </form>
      )}
    </section>
  );
}
