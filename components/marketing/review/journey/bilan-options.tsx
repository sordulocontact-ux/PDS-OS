import { Field } from "@/components/auth/field";
import { FieldError } from "@/components/auth/form-message";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckboxField } from "@/components/ui/checkbox-field";
import { Fold } from "@/components/ui/fold";
import { marketingReview } from "@/lib/i18n/fr/marketing-review";
import { reviewJourney } from "@/lib/i18n/fr/review-journey";
import type { BilanIssue } from "@/lib/marketing/review/issues";
import { REPORT_SECTIONS } from "@/lib/marketing/reports/model";

const fr = { marketingReview, reviewJourney };

const t = fr.reviewJourney.bilan;
const sections = fr.marketingReview.reports.sections;
const categories = fr.marketingReview.reports.reserveCategories;

export type BilanErrors = Partial<
  Record<"summary" | "from" | "to" | "scope", string>
>;

const legend =
  "text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)] font-semibold";
const note =
  "text-[length:var(--type-micro)] leading-[var(--type-micro-lh)] text-[color:var(--text-tertiary)]";

/**
 * « Options du rapport », folded (proto): the period (asked, filled from
 * the first activation to today), the scope, the sections (the summary
 * always in), the reserves to include (every point of « Ce qui manque »).
 * Uncontrolled: the form reads them on « Générer » (`scope:<id>`,
 * `section:<key>`, `reserve:<key>`).
 */
export function BilanOptions({
  id,
  errors,
  defaults,
  activations,
  issues,
}: {
  id: string;
  errors: BilanErrors;
  defaults: { from: string; to: string };
  activations: Array<{ id: string; title: string; state: string }>;
  issues: BilanIssue[];
}) {
  return (
    <Fold summary={t.options}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id={`${id}-from`}
          name="from"
          type="date"
          label={t.from}
          required
          defaultValue={defaults.from}
          error={errors.from}
        />
        <Field
          id={`${id}-to`}
          name="to"
          type="date"
          label={t.to}
          required
          defaultValue={defaults.to}
          error={errors.to}
        />
      </div>
      <fieldset
        id={`${id}-scope`}
        tabIndex={-1}
        className="flex flex-col gap-2"
      >
        <legend className={legend}>{t.scope}</legend>
        {activations.map((a) => (
          <CheckboxField
            key={a.id}
            name={`scope:${a.id}`}
            label={`${a.title} · ${a.state}`}
            defaultChecked
          />
        ))}
        <span className={note}>{t.scopeHint}</span>
        {errors.scope && (
          <FieldError id={`${id}-scope-error`}>{errors.scope}</FieldError>
        )}
      </fieldset>
      <fieldset className="flex flex-col gap-2">
        <legend className={legend}>{t.sections}</legend>
        {REPORT_SECTIONS.map((key) =>
          key === "summary" ? (
            <label key={key} className="flex items-start gap-3">
              <Checkbox
                size="md"
                className="mt-0.5"
                checked
                disabled
                readOnly
              />
              <span className="text-sm font-medium">{sections[key]}</span>
            </label>
          ) : (
            <CheckboxField
              key={key}
              name={`section:${key}`}
              label={sections[key]}
              defaultChecked
            />
          ),
        )}
      </fieldset>
      {issues.length > 0 && (
        <fieldset className="flex flex-col gap-2">
          <legend className={legend}>{t.reservesToInclude}</legend>
          {issues.map((issue) => (
            <CheckboxField
              key={issue.key}
              name={`reserve:${issue.key}`}
              label={`${issue.text} · ${categories[issue.category]}`}
              hint={issue.locked ? t.lockedReserve : undefined}
              defaultChecked
              disabled={issue.locked}
            />
          ))}
        </fieldset>
      )}
    </Fold>
  );
}
