"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import {
  ReserveDraftList,
  type CustomReserve,
} from "@/components/marketing/review/reserve-draft-list";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import type { Activation, Evidence } from "@/lib/marketing/model";
import { generateReport } from "@/lib/marketing/reports/actions";
import {
  REPORT_SECTIONS,
  type ReportSection,
  type ReserveCategory,
} from "@/lib/marketing/reports/model";
import { prepareReport } from "@/lib/marketing/reports/prepare";

const t = fr.marketingReview.reports;
const p = t.preparation;

/**
 * Écran 2, « Préparation du rapport »: scope, period, sections and texts on
 * the left; on the right what PO (the code) sees before generating —
 * missing data, inconsistencies, excluded activations — and the reserves it
 * proposes, ticked by default, plus the author's own.
 */
export function ReportPreparation({
  projectId,
  nextVersion,
  activations,
  evidence,
  openReserves,
}: {
  projectId: string;
  nextVersion: number;
  activations: Activation[];
  evidence: Evidence[];
  openReserves: {
    id: string;
    category: ReserveCategory;
    description: string;
  }[];
}) {
  const router = useRouter();
  const live = activations.filter((a) => a.archivedAt === null);
  const [scope, setScope] = useState<string[]>(live.map((a) => a.id));
  const [sections, setSections] = useState<ReportSection[]>([
    ...REPORT_SECTIONS,
  ]);
  const [unticked, setUnticked] = useState<string[]>([]);
  const [custom, setCustom] = useState<CustomReserve[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const prep = useMemo(
    () =>
      prepareReport(
        activations,
        evidence,
        scope,
        openReserves.map((r) => r.category),
      ),
    [activations, evidence, scope, openReserves],
  );
  const titleOf = (id: string) => live.find((a) => a.id === id)?.title ?? "";
  const toggle = <T,>(list: T[], value: T) =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

  return (
    <form
      className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_24rem]"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const text = (key: string) => String(data.get(key) ?? "");
        setError(null);
        startTransition(async () => {
          const result = await generateReport({
            projectId,
            activationIds: scope,
            periodStart: text("periodStart"),
            periodEnd: text("periodEnd"),
            sections,
            summary: text("summary"),
            recommendations: text("recommendations"),
            reserves: [
              ...prep.reserves
                .filter((r) => !unticked.includes(r.key))
                .map((r) => ({
                  category: r.category,
                  description: p.proposed[
                    r.category as keyof typeof p.proposed
                  ](r.count),
                  activationId: r.activationId ?? "",
                })),
              ...custom
                .filter((c) => c.description.trim() !== "")
                .map((c) => ({
                  category: c.category,
                  description: c.description,
                  activationId: "",
                })),
            ],
          });
          if (!result.ok) return setError(result.error);
          toast.success(p.generated(nextVersion));
          router.push(routes.projectReviewReport(projectId, result.reportId));
        });
      }}
    >
      <div className="grid content-start gap-8">
        <fieldset className="grid gap-3">
          <legend className="text-base font-medium">{p.scope}</legend>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">{p.scopeHint}</p>
            <div className="flex gap-1">
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={() => setScope(live.map((a) => a.id))}
              >
                {p.selectAll}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={() => setScope([])}
              >
                {p.selectNone}
              </Button>
            </div>
          </div>
          <ul className="grid gap-2 rounded-2xl border border-border p-4">
            {live.map((a) => (
              <li key={a.id}>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={scope.includes(a.id)}
                    onChange={() => setScope(toggle(scope, a.id))}
                  />
                  <span className="font-medium">{a.title}</span>
                  <span className="text-muted-foreground">
                    · {fr.marketing.activations.statuses[a.status]}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
        <fieldset className="grid gap-3">
          <legend className="text-base font-medium">{p.period}</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id="report-from"
              name="periodStart"
              type="date"
              label={p.from}
            />
            <Field id="report-to" name="periodEnd" type="date" label={p.to} />
          </div>
        </fieldset>
        <fieldset className="grid gap-3">
          <legend className="text-base font-medium">{p.sections}</legend>
          <ul className="grid gap-2 sm:grid-cols-2">
            {REPORT_SECTIONS.map((section) => (
              <li key={section}>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={sections.includes(section)}
                    onChange={() => setSections(toggle(sections, section))}
                  />
                  {t.sections[section]}
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
        <TextareaField
          id="report-summary"
          name="summary"
          label={p.summary}
          hint={p.summaryHint}
          rows={4}
          maxLength={5000}
        />
        <TextareaField
          id="report-recommendations"
          name="recommendations"
          label={p.recommendations}
          rows={3}
          maxLength={5000}
        />
      </div>

      <aside className="grid content-start gap-6 lg:sticky lg:top-6 lg:self-start">
        <section
          aria-labelledby="checks-title"
          className="grid gap-4 rounded-2xl border border-border p-4"
        >
          <h2 id="checks-title" className="text-base font-medium">
            {p.checks}
          </h2>
          {(
            [
              ["missing", prep.missing],
              ["inconsistencies", prep.inconsistencies],
            ] as const
          ).map(([key, checks]) => (
            <div key={key} className="grid gap-1.5">
              <h3 className="text-sm font-medium">{p[key]}</h3>
              {checks.length === 0 ? (
                <p className="text-sm text-muted-foreground">{p.nothing}</p>
              ) : (
                <ul className="grid gap-1 text-sm text-muted-foreground">
                  {checks.map((c) => (
                    <li key={`${c.kind}-${c.activationId}-${c.evidenceId}`}>
                      {p.checkLabels[c.kind](titleOf(c.activationId))}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
          <div className="grid gap-1.5">
            <h3 className="text-sm font-medium">{p.excluded}</h3>
            {prep.excluded.length === 0 ? (
              <p className="text-sm text-muted-foreground">{p.nothing}</p>
            ) : (
              <ul className="grid gap-1 text-sm text-muted-foreground">
                {prep.excluded.map((a) => (
                  <li key={a.id}>{a.title}</li>
                ))}
              </ul>
            )}
          </div>
        </section>
        <ReserveDraftList
          carried={openReserves.map((r) => ({
            id: r.id,
            label: `${t.reserveCategories[r.category]} · ${r.description}`,
          }))}
          proposed={prep.reserves.map((r) => ({
            key: r.key,
            label: p.proposed[r.category as keyof typeof p.proposed](r.count),
            checked: !unticked.includes(r.key),
          }))}
          onToggle={(key) => setUnticked(toggle(unticked, key))}
          custom={custom}
          onCustomChange={setCustom}
        />
        <FormMessage kind="error">{error}</FormMessage>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            size="lg"
            onClick={() => router.push(routes.projectReviewReports(projectId))}
          >
            {p.cancel}
          </Button>
          <Button
            type="submit"
            size="lg"
            disabled={pending || scope.length === 0 || sections.length === 0}
            aria-busy={pending || undefined}
          >
            {pending ? p.generating : p.generate(nextVersion)}
          </Button>
        </div>
      </aside>
    </form>
  );
}
