"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { SubmitButton } from "@/components/auth/submit-button";
import { TextareaField } from "@/components/auth/textarea-field";
import { BriefCalendarFields } from "@/components/master-workflow/brief-calendar-fields";
import { BriefEngineerField } from "@/components/master-workflow/brief-engineer-field";
import { OptionSelect } from "@/components/projects/option-select";
import { FormSection } from "@/components/ui/form-section";
import { idleFormState } from "@/lib/auth/form-state";
import { centsToInput } from "@/lib/budget/types";
import { fr } from "@/lib/i18n/fr";
import { saveMasterBrief } from "@/lib/master-workflow/brief-actions";
import {
  BRIEF_DELIVERABLES,
  type BriefView,
} from "@/lib/master-workflow/brief-types";

const NONE = "none";
const rateInput = (cents: number | null) =>
  cents === null ? "" : centsToInput(cents);

/**
 * The Brief Mix/Master as one form, a white card per dimension (ticket § 3);
 * its budget is the section after it (BriefBudget).
 * The project's owner saves it; anyone else reads the same fields, locked.
 * After a refused save, the typed values come back with each field's error.
 */
export function BriefForm({ view }: { view: BriefView }) {
  const t = fr.masterWorkflow.brief;
  const f = t.fields;
  const [state, formAction] = useActionState(saveMasterBrief, idleFormState);
  const values = state.status === "error" ? (state.values ?? {}) : {};
  const errors = state.status === "error" ? (state.fieldErrors ?? {}) : {};
  const value = (name: string, saved: string | number | null) =>
    values[name] ?? (saved ?? "").toString();
  const { brief } = view;

  const [same, setSame] = useState(brief.masteringSameEngineer);

  useEffect(() => {
    if (state.status === "success") toast.success(t.savedToast);
  }, [state, t.savedToast]);

  return (
    <form action={formAction} noValidate className="flex flex-col gap-6">
      <input type="hidden" name="projectId" value={view.projectId} />
      <fieldset disabled={!view.canEdit} className="contents">
        <FormSection title={t.sections.mix.title}>
          <BriefEngineerField
            name="mixContactId"
            label={f.mixEngineer}
            engineers={view.engineers}
            defaultValue={brief.mixContactId}
          />
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              name="mixRate"
              label={f.mixRate}
              hint={f.rateHint}
              inputMode="decimal"
              autoComplete="off"
              suffix="€"
              defaultValue={value("mixRate", rateInput(brief.mixRateCents))}
              error={errors.mixRate}
            />
            <Field
              name="revisions"
              type="number"
              min={0}
              max={20}
              label={f.revisions}
              hint={f.revisionsHint}
              defaultValue={value("revisions", brief.revisions)}
              error={errors.revisions}
            />
          </div>
          <OptionSelect
            name="validatorPersonId"
            label={f.validator}
            hint={f.validatorHint}
            items={{
              [NONE]: t.none,
              ...Object.fromEntries(
                view.validators.map((person) => [person.personId, person.name]),
              ),
            }}
            defaultValue={
              value("validatorPersonId", brief.validatorPersonId) || NONE
            }
            error={errors.validatorPersonId}
          />
        </FormSection>

        <FormSection title={t.sections.mastering.title}>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              name="masteringSameEngineer"
              value="1"
              checked={same}
              onChange={(event) => setSame(event.target.checked)}
              className="size-4 accent-selection"
            />
            {f.sameEngineer}
          </label>
          {!same && (
            <BriefEngineerField
              name="masteringContactId"
              label={f.masteringEngineer}
              engineers={view.engineers}
              defaultValue={brief.masteringContactId}
            />
          )}
          <Field
            name="masteringRate"
            label={f.masteringRate}
            hint={f.rateHint}
            inputMode="decimal"
            autoComplete="off"
            suffix="€"
            defaultValue={value(
              "masteringRate",
              rateInput(brief.masteringRateCents),
            )}
            error={errors.masteringRate}
          />
        </FormSection>

        <FormSection title={t.sections.direction.title}>
          <TextareaField
            name="references"
            label={f.references}
            hint={f.referencesHint}
            rows={3}
            maxLength={2000}
            defaultValue={value("references", brief.references)}
            error={errors.references}
          />
          <TextareaField
            name="direction"
            label={f.direction}
            rows={3}
            maxLength={2000}
            defaultValue={value("direction", brief.direction)}
            error={errors.direction}
          />
          <TextareaField
            name="constraints"
            label={f.constraints}
            rows={2}
            maxLength={2000}
            defaultValue={value("constraints", brief.constraints)}
            error={errors.constraints}
          />
        </FormSection>

        <FormSection title={t.sections.deliverables.title}>
          <OptionSelect
            multiple
            name="deliverables"
            label={f.deliverables}
            items={Object.fromEntries(
              BRIEF_DELIVERABLES.map((key) => [key, t.deliverables[key]]),
            )}
            defaultValue={brief.deliverables}
          />
        </FormSection>

        <FormSection title={t.sections.calendar.title}>
          <BriefCalendarFields initial={brief.dates} error={errors.calendar} />
        </FormSection>
      </fieldset>

      {state.status === "error" && state.formError && (
        <FormMessage kind="error">{state.formError}</FormMessage>
      )}
      {view.canEdit && (
        <div className="flex justify-end">
          <SubmitButton pendingLabel={t.submitting}>{t.submit}</SubmitButton>
        </div>
      )}
    </form>
  );
}
