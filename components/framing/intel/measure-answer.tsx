"use client";

import { IconXmark } from "nucleo-sharp-essential";
import { useState } from "react";

import { FieldError } from "@/components/auth/form-message";
import {
  StructuredActions,
  type StructuredAnswerProps,
} from "@/components/framing/intel/structured-answer";
import { useFramingAction } from "@/components/framing/use-framing-action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { answerMeasures } from "@/lib/framing/actions/answers";
import { MAX_MEASURES } from "@/lib/framing/dimensions";
import { framingIntel } from "@/lib/i18n/fr/framing-intel";

const fr = { framingIntel };

type Row = { target: string; metric: string; period: string; source: string };

const empty: Row = { target: "", metric: "", period: "", source: "" };

// The first figure of a sentence said (« 500 000 streams » → 500000).
const number = (text: string) => {
  const digits = text.replace(/[\s  ]/g, "").match(/\d+(?:[.,]\d+)?/);
  return digits ? digits[0].replace(",", ".") : "";
};

const valueOf = (target: string) =>
  Number(target.replace(",", ".").replace(/\s/g, ""));

/**
 * Measurable objectives (PROJ-UX-04), one or several (Ibé 01/11/2026:
 * streams, views, followers…): for each, metric, target and period are
 * required — « 500 000 streams le premier mois » is stored as such. What
 * was said stays in sight; only the target is read from it, by code.
 */
export function MeasureAnswer({
  projectId,
  question,
  draft,
  keepSource,
  onCancel,
  onDone,
}: StructuredAnswerProps) {
  const t = fr.framingIntel.measure;
  const { pending, run } = useFramingAction();
  const current =
    question.answer?.kind === "text" ? question.answer.measures : undefined;
  const said =
    draft ??
    (question.answer?.kind === "text" && !current
      ? question.answer.text
      : null);
  const [rows, setRows] = useState<Row[]>(() =>
    current?.length
      ? current.map((m) => ({
          target: String(m.target),
          metric: m.metric,
          period: m.period,
          source: m.source ?? "",
        }))
      : [{ ...empty, target: said ? number(said) : "" }],
  );
  const [tried, setTried] = useState(false);
  const set = (index: number, patch: Partial<Row>) =>
    setRows((all) =>
      all.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  const errorsOf = (row: Row) => {
    const value = valueOf(row.target);
    return {
      target:
        row.target.trim() && Number.isFinite(value) && value >= 0
          ? undefined
          : t.targetRequired,
      metric: row.metric.trim() ? undefined : t.metricRequired,
      period: row.period.trim() ? undefined : t.periodRequired,
    };
  };
  const errors = rows.map(errorsOf);
  const invalid = errors.some((e) => e.target || e.metric || e.period);
  const several = rows.length > 1;

  return (
    <form
      className="flex flex-col gap-4"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        setTried(true);
        if (invalid) {
          // Focus on the first field missing, in reading order.
          const index = errors.findIndex(
            (e) => e.target || e.metric || e.period,
          );
          const e = errors[index];
          const name = e.target ? "target" : e.metric ? "metric" : "period";
          document.getElementById(`measure-${index}-${name}`)?.focus();
          return;
        }
        run(
          () =>
            answerMeasures(
              projectId,
              question.key,
              rows.map((row) => ({
                metric: row.metric,
                target: valueOf(row.target),
                period: row.period,
                source: row.source,
              })),
              keepSource,
            ),
          onDone,
        );
      }}
    >
      {said && (
        <p className="text-caption text-muted-foreground">{t.said(said)}</p>
      )}
      <ul className="flex flex-col gap-4">
        {rows.map((row, index) => {
          const id = (field: string) => `measure-${index}-${field}`;
          const shown = (e?: string) => (tried ? e : undefined);
          const field = (
            name: keyof Row,
            label: string,
            placeholder: string,
            error?: string,
          ) => (
            <div className="grid gap-1.5">
              <Label htmlFor={id(name)} required={name !== "source"}>
                {label}
              </Label>
              <Input
                id={id(name)}
                value={row[name]}
                placeholder={placeholder}
                maxLength={100}
                inputMode={name === "target" ? "decimal" : undefined}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? `${id(name)}-error` : undefined}
                onChange={(e) => set(index, { [name]: e.target.value })}
              />
              <FieldError id={`${id(name)}-error`}>{error}</FieldError>
            </div>
          );
          return (
            <li
              key={index}
              className="flex flex-col gap-3 not-first:border-t not-first:border-[color:var(--border-hairline)] not-first:pt-4"
            >
              {several && (
                <div className="flex items-center justify-between gap-2">
                  <p className="text-caption font-semibold text-[color:var(--text-secondary)]">
                    {t.nth(index + 1)}
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={t.remove(index + 1)}
                    onClick={() =>
                      setRows((all) => all.filter((_, i) => i !== index))
                    }
                  >
                    <IconXmark aria-hidden />
                  </Button>
                </div>
              )}
              <div className="grid gap-4 sm:grid-cols-3">
                {field(
                  "target",
                  t.target,
                  t.targetPlaceholder,
                  shown(errors[index].target),
                )}
                {field(
                  "metric",
                  t.metric,
                  t.metricPlaceholder,
                  shown(errors[index].metric),
                )}
                {field(
                  "period",
                  t.period,
                  t.periodPlaceholder,
                  shown(errors[index].period),
                )}
              </div>
              {field("source", t.source, t.sourcePlaceholder)}
            </li>
          );
        })}
      </ul>
      {rows.length < MAX_MEASURES && (
        <Button
          type="button"
          variant="outline"
          className="self-start"
          onClick={() => setRows((all) => [...all, empty])}
        >
          {t.add}
        </Button>
      )}
      <StructuredActions pending={pending} onCancel={onCancel} />
    </form>
  );
}
