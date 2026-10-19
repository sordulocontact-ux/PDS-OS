"use client";

import { useState } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { Button } from "@/components/ui/button";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { fr } from "@/lib/i18n/fr";
import type { BilanIssue } from "@/lib/marketing/review/issues";
import { generateReport } from "@/lib/marketing/reports/actions";
import { REPORT_SECTIONS } from "@/lib/marketing/reports/model";

import { BilanOptions, type BilanErrors } from "./bilan-options";

const t = fr.reviewJourney.bilan;
const ID = "bilan";

export type BilanPrepareProps = {
  projectId: string;
  version: number;
  issues: BilanIssue[];
  // Reserves already open, carried over as they are.
  carried: number;
  activations: Array<{ id: string; title: string; state: string }>;
  defaults: {
    from: string;
    to: string;
    summary?: string;
    recommendations?: string;
  };
  // PO opens it filled (CLAUDE.md, « Un nouveau formulaire »).
  stay?: boolean;
};

/**
 * « Préparer la version N » (proto `bi1`): two fields, « Ce qui manque »
 * read by the code, the options folded, « Générer la version N ». Every
 * missing field turns red with its reason at the first try, the first one
 * takes the focus (opening the options when it is there); the button is
 * never disabled.
 */
export function BilanPrepareForm({
  projectId,
  version,
  issues,
  carried,
  activations,
  defaults,
}: BilanPrepareProps) {
  const [errors, setErrors] = useState<BilanErrors>({});
  const { pending, error, run } = useWriteSubmit(
    () => setErrors({}),
    t.generated(version),
  );

  const submit = (form: HTMLFormElement) => {
    const data = new FormData(form);
    const text = (key: string) => String(data.get(key) ?? "").trim();
    const ticked = (prefix: string) =>
      [...data.keys()]
        .filter((k) => k.startsWith(prefix))
        .map((k) => k.slice(prefix.length));
    const from = text("from");
    const to = text("to");
    const scope = ticked("scope:");
    const next: BilanErrors = {
      summary: text("summary") ? undefined : t.summaryRequired,
      from: from ? undefined : t.fromRequired,
      to: !to ? t.toRequired : from && to < from ? t.order : undefined,
      scope: scope.length ? undefined : t.scopeRequired,
    };
    setErrors(next);
    const first = (["summary", "from", "to", "scope"] as const).find(
      (k) => next[k],
    );
    if (first) {
      const field = document.getElementById(`${ID}-${first}`);
      field?.closest("details")?.setAttribute("open", "");
      field?.focus();
      return;
    }
    const kept = ticked("reserve:");
    run(() =>
      generateReport(
        {
          projectId,
          activationIds: scope,
          periodStart: from,
          periodEnd: to,
          sections: [
            "summary",
            ...REPORT_SECTIONS.filter((s) => ticked("section:").includes(s)),
          ],
          summary: text("summary"),
          recommendations: text("recommendations"),
          reserves: issues
            .filter((i) => kept.includes(i.key))
            .map((i) => ({
              category: i.category,
              description: i.text,
              activationId: i.activationId ?? "",
            })),
        },
        version,
      ),
    );
  };

  const missing = Object.values(errors).filter(Boolean).length;
  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        submit(event.currentTarget);
      }}
    >
      <h3 className="text-[length:var(--type-body-md)] leading-[var(--type-body-md-lh)] font-semibold">
        {t.prepare(version)}
      </h3>
      <TextareaField
        id={`${ID}-summary`}
        name="summary"
        label={t.summary}
        placeholder={t.summaryPlaceholder}
        required
        rows={2}
        maxLength={5000}
        defaultValue={defaults.summary}
        error={errors.summary}
      />
      <TextareaField
        id={`${ID}-recommendations`}
        name="recommendations"
        label={t.recommendations}
        placeholder={t.recommendationsPlaceholder}
        rows={2}
        maxLength={5000}
        defaultValue={defaults.recommendations}
      />
      <div className="flex flex-col gap-1.5">
        <b className="text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)] font-semibold">
          {t.missing}
        </b>
        <span className="text-[length:var(--type-micro)] leading-[var(--type-micro-lh)] text-[color:var(--text-tertiary)]">
          {t.missingHint}
        </span>
        {issues.length > 0 ? (
          <ul className="flex list-disc flex-col gap-1 pl-5 text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)]">
            {issues.map((issue) => (
              <li key={issue.key}>{issue.text}</li>
            ))}
          </ul>
        ) : (
          <p className="text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)] text-[color:var(--text-secondary)]">
            {t.nothingMissing}
          </p>
        )}
        {carried > 0 && (
          <span className="text-[length:var(--type-micro)] leading-[var(--type-micro-lh)] text-[color:var(--text-tertiary)]">
            {t.carried(carried)}
          </span>
        )}
      </div>
      <BilanOptions
        id={ID}
        errors={errors}
        defaults={defaults}
        activations={activations}
        issues={issues}
      />
      <FormMessage kind="error">
        {error ?? (missing > 0 ? t.missingFields(missing) : null)}
      </FormMessage>
      <div>
        <Button
          type="submit"
          disabled={pending}
          aria-busy={pending || undefined}
        >
          {t.generate(version)}
        </Button>
      </div>
    </form>
  );
}
