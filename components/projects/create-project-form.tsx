"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { SubmitButton } from "@/components/auth/submit-button";
import { TextareaField } from "@/components/auth/textarea-field";
import { MasterPicker } from "@/components/catalog/master-picker";
import { OptionSelect } from "@/components/projects/option-select";
import { buttonVariants } from "@/components/ui/button";
import { routes } from "@/lib/auth/redirects";
import type { ArtistOption, MasterOption } from "@/lib/catalog/types";
import { fr } from "@/lib/i18n/fr";
import { createProject } from "@/lib/projects/actions";
import {
  PRIORITIES,
  PROJECT_TYPES,
  idleCreateProjectState,
  isProjectType,
  type ProjectType,
} from "@/lib/projects/types";

// Step C. Same form from the projects list (blank) and from a master page
// (master linked, type and title prefilled). The master rule is checked on
// submit only: switching the type never shows a warning in advance.
export function CreateProjectForm({
  masters,
  artists,
  defaults,
}: {
  masters: MasterOption[];
  artists: ArtistOption[];
  defaults: { title: string; type: ProjectType | null; masterIds: string[] };
}) {
  const t = fr.shell.newProject;
  const [state, action] = useActionState(createProject, idleCreateProjectState);
  const values = state.status === "error" ? (state.values ?? {}) : {};
  const errors = state.status === "error" ? (state.fieldErrors ?? {}) : {};
  const [type, setType] = useState<ProjectType | null>(defaults.type);

  const typeItems = Object.fromEntries(
    PROJECT_TYPES.map((value) => [value, fr.shell.projectTypes[value]]),
  );
  const priorityItems = Object.fromEntries(
    PRIORITIES.map((value) => [value, fr.shell.priorities[value]]),
  );

  return (
    <form action={action} noValidate className="flex flex-col gap-5">
      <Field
        name="title"
        label={t.fields.title}
        required
        autoFocus={!defaults.title}
        autoComplete="off"
        maxLength={200}
        defaultValue={values.title ?? defaults.title}
        error={errors.title}
      />

      <OptionSelect
        name="type"
        label={t.fields.type}
        items={typeItems}
        defaultValue={values.type || defaults.type}
        onValueChange={(value) => setType(isProjectType(value) ? value : null)}
        error={errors.type}
      />

      <MasterPicker
        masters={masters}
        artists={artists}
        defaultSelectedIds={defaults.masterIds}
        hint={
          type && type !== "music_release"
            ? t.fields.mastersOptional
            : undefined
        }
        error={errors.masterIds}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          name="dueDate"
          type="date"
          label={t.fields.dueDate}
          hint={t.fields.dueDateHint}
          defaultValue={values.dueDate ?? ""}
          error={errors.dueDate}
        />
        <Field
          name="budget"
          label={t.fields.budget}
          hint={t.fields.budgetHint}
          inputMode="decimal"
          autoComplete="off"
          maxLength={20}
          defaultValue={values.budget ?? ""}
          error={errors.budget}
          className="h-10 text-base tabular-nums md:text-sm"
        />
      </div>

      <OptionSelect
        name="priority"
        label={t.fields.priority}
        placeholder={t.fields.priorityNone}
        items={priorityItems}
        defaultValue={values.priority || null}
        error={errors.priority}
      />

      <TextareaField
        name="framingNotes"
        label={t.fields.notes}
        hint={t.fields.notesHint}
        maxLength={20000}
        defaultValue={values.framingNotes ?? ""}
        error={errors.framingNotes}
      />

      {state.status === "error" && state.formError && (
        <FormMessage kind="error">{state.formError}</FormMessage>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Link
          href={routes.projects}
          className={buttonVariants({ variant: "ghost", size: "lg" })}
        >
          {t.cancel}
        </Link>
        <SubmitButton pendingLabel={t.submitting}>{t.submit}</SubmitButton>
      </div>
    </form>
  );
}
