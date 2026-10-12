"use client";

import { useState } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { OptionSelect } from "@/components/framing/option-select";
import { ChipMultiChoice } from "@/components/ui/chip-choice";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { Label } from "@/components/ui/label";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { fr } from "@/lib/i18n/fr";
import type { PlanStepValues } from "@/lib/plan/step-actions";
import {
  PLAN_COLUMNS,
  PLAN_WORKFLOWS,
  type PlanColumn,
  type PlanWorkflow,
} from "@/lib/plan/propose";
import type { WriteResult } from "@/lib/utils/write-result";

const NOBODY = "none";

/**
 * A step of the plan in a dialog (PROJ-UX-07): its name (an added step only),
 * column, pilot, executor, due date and dependencies. The same form before
 * the launch (kept in the board until « Lancer le plan ») and after (written
 * with its history). Missing values turn red at the first try only.
 */
export function PlanStepForm({
  initial,
  workflow,
  members,
  withTitle,
  submitLabel,
  doneMessage,
  run,
  onDone,
}: {
  initial: PlanStepValues;
  // The step's own workflow: never a note, never its own dependency.
  workflow: PlanWorkflow | null;
  members: Array<{ personId: string; name: string }>;
  withTitle: boolean;
  submitLabel: string;
  doneMessage: string;
  run: (values: PlanStepValues) => Promise<WriteResult>;
  onDone: () => void;
}) {
  const t = fr.planSteps;
  const tp = fr.framingIntel.plan;
  const [values, setValues] = useState<PlanStepValues>(initial);
  const [tried, setTried] = useState(false);
  const { pending, error, run: submit } = useWriteSubmit(onDone, doneMessage);
  const set = (change: Partial<PlanStepValues>) =>
    setValues((v) => ({ ...v, ...change }));
  const titleMissing = withTitle && !values.title?.trim();
  const columns = Object.fromEntries(
    PLAN_COLUMNS.filter((c) => workflow === null || c !== "anticipate").map(
      (c) => [c, tp.columns[c]],
    ),
  );
  const people = Object.fromEntries(members.map((m) => [m.personId, m.name]));

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        setTried(true);
        if (titleMissing) return;
        submit(() => run({ ...values, title: values.title?.trim() || null }));
      }}
    >
      {withTitle && (
        <Field
          name="step-title"
          label={t.title}
          required
          maxLength={200}
          value={values.title ?? ""}
          onChange={(e) => set({ title: e.target.value })}
          error={tried && titleMissing ? t.missingTitle : undefined}
        />
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="step-column" required>
            {t.column}
          </Label>
          <OptionSelect
            id="step-column"
            label={t.column}
            required
            options={columns}
            value={values.column}
            onChange={(v) => set({ column: v as PlanColumn })}
          />
        </div>
        <Field
          name="step-due"
          type="date"
          label={t.due}
          value={values.dueDate ?? ""}
          onChange={(e) => set({ dueDate: e.target.value || null })}
        />
        <div className="grid gap-1.5">
          <Label htmlFor="step-pilot">{t.pilot}</Label>
          <OptionSelect
            id="step-pilot"
            label={t.pilot}
            options={{ [NOBODY]: tp.noOwner, ...people }}
            value={values.ownerPersonId ?? NOBODY}
            onChange={(v) => set({ ownerPersonId: v === NOBODY ? null : v })}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="step-executor">{t.executor}</Label>
          <OptionSelect
            id="step-executor"
            label={t.executor}
            options={{ [NOBODY]: t.executorSame, ...people }}
            value={values.executorPersonId ?? NOBODY}
            onChange={(v) => set({ executorPersonId: v === NOBODY ? null : v })}
          />
        </div>
      </div>
      <ChipMultiChoice
        name="step-depends"
        legend={t.dependsOn}
        options={PLAN_WORKFLOWS.filter((w) => w !== workflow).map((w) => ({
          value: w,
          label: tp.workflows[w],
        }))}
        defaultValue={values.dependsOn ?? []}
        onChange={(dependsOn) => set({ dependsOn })}
      />
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <DialogFormActions
        pending={pending}
        submitLabel={submitLabel}
        onCancel={onDone}
      />
    </form>
  );
}
