"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { SubmitButton } from "@/components/auth/submit-button";
import { TextareaField } from "@/components/auth/textarea-field";
import { MasterPicker } from "@/components/catalog/master-picker";
import { OptionSelect } from "@/components/projects/option-select";
import { ProjectDraftControls } from "@/components/projects/project-draft-controls";
import { ProjectTeamFields } from "@/components/projects/project-team-fields";
import { useProjectDraft } from "@/components/projects/use-project-draft";
import { Button, buttonVariants } from "@/components/ui/button";
import { routes } from "@/lib/auth/redirects";
import type { ArtistOption, MasterOption } from "@/lib/catalog/types";
import { fr } from "@/lib/i18n/fr";
import { createProject } from "@/lib/projects/actions";
import type { CreativeMember } from "@/lib/projects/creatives";
import { updateProject } from "@/lib/projects/edit-actions";
import {
  PRIORITIES,
  PROJECT_TYPES,
  idleCreateProjectState,
  isProjectType,
  type Priority,
  type ProjectType,
} from "@/lib/projects/types";

export type ProjectFormDefaults = {
  title: string;
  type: ProjectType | null;
  masterIds: string[];
  assigneePersonId?: string | null;
  creativePersonIds?: string[];
  dueDate?: string;
  budget?: string;
  priority?: Priority | null;
  framingNotes?: string;
};

// Step C. Same form from the projects list (blank) and from a master page
// (master linked, type and title prefilled). The master rule is checked on
// submit only: switching the type never shows a warning in advance.
// The team is chosen here: the project goes to its manager at creation.
// With `projectId` it edits a project that is not launched (no team then);
// with `onSaved` (side panel, a PO draft) the page behind stays.
// On the new project page, what is typed is kept as a draft (`draftId`: the
// one being resumed).
export function CreateProjectForm({
  masters,
  artists,
  managers,
  creatives,
  defaults,
  projectId,
  draftId: resumedDraftId = null,
  onSaved,
  onCancel,
}: {
  masters: MasterOption[];
  artists: ArtistOption[];
  managers: CreativeMember[];
  creatives: CreativeMember[];
  defaults: ProjectFormDefaults;
  projectId?: string;
  draftId?: string | null;
  onSaved?: (project: { id: string; title: string }) => void;
  onCancel?: () => void;
}) {
  const t = fr.shell.newProject;
  const [state, action] = useActionState(
    projectId ? updateProject : createProject,
    idleCreateProjectState,
  );
  const values = state.status === "error" ? (state.values ?? {}) : {};
  const errors = state.status === "error" ? (state.fieldErrors ?? {}) : {};
  const [type, setType] = useState<ProjectType | null>(defaults.type);
  const formRef = useRef<HTMLFormElement>(null);
  const withDraft = !projectId && !onSaved;
  const draft = useProjectDraft(formRef, resumedDraftId, withDraft);

  // A refused creation keeps the form, and its draft, going.
  const { pause } = draft;
  useEffect(() => {
    if (state.status === "error") pause(false);
  }, [state, pause]);

  useEffect(() => {
    if (state.status === "saved") onSaved?.(state.project);
    // onSaved changes identity on every render of the parent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const typeItems = Object.fromEntries(
    PROJECT_TYPES.map((value) => [value, fr.shell.projectTypes[value]]),
  );
  const priorityItems = Object.fromEntries(
    PRIORITIES.map((value) => [value, fr.shell.priorities[value]]),
  );

  return (
    <form
      ref={formRef}
      action={action}
      // The created project deletes the draft: nothing is saved meanwhile.
      onSubmit={() => pause(true)}
      noValidate
      className="flex flex-col gap-5"
    >
      {onSaved && <input type="hidden" name="intent" value="dialog" />}
      {withDraft && draft.draftId && (
        <input type="hidden" name="draftId" value={draft.draftId} />
      )}
      {projectId && <input type="hidden" name="projectId" value={projectId} />}
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

      {!projectId && (
        <ProjectTeamFields
          managers={managers}
          creatives={creatives}
          defaultManagerId={
            values.assigneePersonId || defaults.assigneePersonId || null
          }
          defaultCreativeIds={
            values.creativePersonIds
              ? parseIds(values.creativePersonIds)
              : (defaults.creativePersonIds ?? [])
          }
          errors={errors}
        />
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          name="dueDate"
          type="date"
          label={t.fields.dueDate}
          hint={t.fields.dueDateHint}
          defaultValue={values.dueDate ?? defaults.dueDate ?? ""}
          error={errors.dueDate}
        />
        <Field
          name="budget"
          label={t.fields.budget}
          hint={t.fields.budgetHint}
          inputMode="decimal"
          autoComplete="off"
          maxLength={20}
          defaultValue={values.budget ?? defaults.budget ?? ""}
          error={errors.budget}
          className="h-10 text-base tabular-nums md:text-sm"
        />
      </div>

      <OptionSelect
        name="priority"
        label={t.fields.priority}
        placeholder={t.fields.priorityNone}
        items={priorityItems}
        defaultValue={values.priority || defaults.priority || null}
        error={errors.priority}
      />

      <TextareaField
        name="framingNotes"
        label={t.fields.notes}
        hint={t.fields.notesHint}
        maxLength={20000}
        defaultValue={values.framingNotes ?? defaults.framingNotes ?? ""}
        error={errors.framingNotes}
      />

      {state.status === "error" && state.formError && (
        <FormMessage kind="error">{state.formError}</FormMessage>
      )}

      {withDraft && (
        <ProjectDraftControls
          draftId={draft.draftId}
          status={draft.status}
          pause={pause}
        />
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {onCancel ? (
          <Button type="button" variant="ghost" size="lg" onClick={onCancel}>
            {t.cancel}
          </Button>
        ) : (
          <Link
            href={routes.projects}
            className={buttonVariants({ variant: "ghost", size: "lg" })}
          >
            {t.cancel}
          </Link>
        )}
        {projectId ? (
          <SubmitButton pendingLabel={t.saving}>{t.save}</SubmitButton>
        ) : (
          <SubmitButton pendingLabel={t.submitting}>{t.submit}</SubmitButton>
        )}
      </div>
    </form>
  );
}

// Selection sent back by the server after an error (a JSON list of ids).
function parseIds(raw: string | undefined): string[] {
  try {
    const value: unknown = JSON.parse(raw || "[]");
    return Array.isArray(value)
      ? value.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}
