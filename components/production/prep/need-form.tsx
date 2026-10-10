"use client";

import { useState } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { OptionSelect } from "@/components/projects/option-select";
import { fr } from "@/lib/i18n/fr";
import {
  addProductionNeed,
  updateProductionNeed,
} from "@/lib/production/needs-actions";
import {
  FAMILY_ROLES,
  hasSpeciality,
  MAX_HEADCOUNT,
  type NeedFamily,
} from "@/lib/production/roles";
import type { ProductionNeed } from "@/lib/production/sheet";

import { DialogFormActions } from "./need-dialog-actions";
import { roleLabel } from "./need-label";
import { usePrepSubmit } from "./use-prep-submit";

const t = fr.productionNeeds;

/** What the form starts from: a saved need, a suggestion of PO, or nothing. */
export type NeedDraft = {
  need: ProductionNeed | null;
  roleKey: string | null;
  // The suggestion's reason, already in French.
  suggestedBecause: string | null;
};

/**
 * Adds or edits a position of one family: the position (preset, or « Autre »
 * with its label), a speciality for a performer, the number of people typed
 * by the person, a note. A suggestion of PO only pre-fills it.
 */
export function NeedForm({
  projectId,
  sheetId,
  family,
  draft,
  onDone,
}: {
  projectId: string;
  sheetId: string;
  family: NeedFamily;
  draft: NeedDraft;
  onDone: () => void;
}) {
  const { need } = draft;
  const [roleKey, setRoleKey] = useState<string | null>(
    need?.roleKey ?? draft.roleKey,
  );
  const [missing, setMissing] = useState<{
    role?: boolean;
    label?: boolean;
    headcount?: boolean;
  }>({});
  const { pending, error, run } = usePrepSubmit(
    onDone,
    need ? t.edit.done : t.add.done,
  );
  const prefix = `need-${need?.id ?? family}`;

  function submit(form: HTMLFormElement) {
    const data = new FormData(form);
    const text = (name: string) => String(data.get(name) ?? "").trim();
    const headcount = Number(text("headcount"));
    const next = {
      role: !roleKey,
      label: roleKey === "other" && !text("label"),
      headcount:
        !Number.isInteger(headcount) ||
        headcount < 1 ||
        headcount > MAX_HEADCOUNT,
    };
    setMissing(next);
    const first = (["role", "label", "headcount"] as const).find(
      (k) => next[k],
    );
    if (first) {
      form.querySelector<HTMLElement>(`#${prefix}-${first}`)?.focus();
      return;
    }
    const fields = {
      projectId,
      family,
      roleKey: roleKey ?? "",
      label: text("label"),
      speciality: text("speciality"),
      headcount,
      note: text("note"),
    };
    run(() =>
      need
        ? updateProductionNeed({ ...fields, needId: need.id })
        : addProductionNeed({ ...fields, sheetId }),
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
      {draft.suggestedBecause && (
        <FormMessage kind="info">
          {t.suggestions.formNote(draft.suggestedBecause)}
        </FormMessage>
      )}
      <OptionSelect
        id={`${prefix}-role`}
        name="roleKey"
        label={t.fields.role}
        placeholder={t.fields.rolePlaceholder}
        required
        items={Object.fromEntries(
          FAMILY_ROLES[family].map((key) => [key, roleLabel(key)]),
        )}
        defaultValue={need?.roleKey ?? draft.roleKey}
        onValueChange={setRoleKey}
        error={missing.role ? t.missing.role : undefined}
      />
      {roleKey === "other" && (
        <Field
          id={`${prefix}-label`}
          name="label"
          label={t.fields.label}
          aria-required
          autoComplete="off"
          maxLength={120}
          placeholder={t.fields.labelPlaceholder}
          defaultValue={need?.label ?? ""}
          error={missing.label ? t.missing.label : undefined}
        />
      )}
      {hasSpeciality(family) && (
        <Field
          id={`${prefix}-speciality`}
          name="speciality"
          label={t.fields.speciality}
          autoComplete="off"
          maxLength={120}
          placeholder={t.fields.specialityPlaceholder}
          hint={t.fields.specialityHint}
          defaultValue={need?.speciality ?? ""}
        />
      )}
      <Field
        id={`${prefix}-headcount`}
        name="headcount"
        label={t.fields.headcount}
        type="number"
        inputMode="numeric"
        min={1}
        max={MAX_HEADCOUNT}
        step={1}
        aria-required
        defaultValue={String(need?.headcount ?? 1)}
        error={
          missing.headcount ? t.missing.headcount(MAX_HEADCOUNT) : undefined
        }
      />
      <TextareaField
        id={`${prefix}-note`}
        name="note"
        label={t.fields.note}
        rows={3}
        maxLength={1000}
        placeholder={t.fields.notePlaceholder}
        defaultValue={need?.note ?? ""}
      />
      <FormMessage kind="error">{error}</FormMessage>
      <DialogFormActions
        pending={pending}
        submitLabel={need ? t.edit.submit : t.add.submit}
        onCancel={onDone}
      />
    </form>
  );
}
