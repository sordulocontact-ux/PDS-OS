"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { SubmitButton } from "@/components/auth/submit-button";
import { TextareaField } from "@/components/auth/textarea-field";
import { ProjectDraftControls } from "@/components/projects/project-draft-controls";
import { ProjectKindFields } from "@/components/projects/project-kind-fields";
import { ProjectTeamFields } from "@/components/projects/project-team-fields";
import { useProjectDraft } from "@/components/projects/use-project-draft";
import { Button, buttonVariants } from "@/components/ui/button";
import { ChipChoice } from "@/components/ui/chip-choice";
import { FormSection } from "@/components/ui/form-section";
import { routes } from "@/lib/auth/redirects";
import type { ArtistOption, MasterOption } from "@/lib/catalog/types";
import { fr } from "@/lib/i18n/fr";
import { createProject } from "@/lib/projects/actions";
import type { CreativeMember } from "@/lib/projects/creatives";
import { updateProject } from "@/lib/projects/edit-actions";
import {
  PRIORITIES,
  idleCreateProjectState,
  type ContentFormatOption,
  type ContentMode,
  type MusicFormat,
  type Priority,
  type ProjectType,
} from "@/lib/projects/types";

export type ProjectFormDefaults = {
  title: string;
  type: ProjectType | null;
  musicFormat?: MusicFormat | null;
  contentMode?: ContentMode | null;
  contentFormatId?: string | null;
  artistId?: string | null;
  masterIds: string[];
  assigneePersonId?: string | null;
  creativePersonIds?: string[];
  dueDate?: string;
  budget?: string;
  priority?: Priority | null;
  initialContext?: string;
};

// Step C (feedback n°2): Type → Format → linked objects → initial
// information → project manager → transmitted. Same form from the projects
// list (blank) and from a master page (music, single, that master linked).
// Rules are checked on submit only: switching the type never warns ahead.
// With `projectId` it edits a project that is not launched (no team then);
// with `onSaved` (side panel, a PO draft) the page behind stays. Both show
// the sections without their cards. On the new project page, what is typed
// is kept as a draft (`draftId`: the one being resumed).
export function CreateProjectForm({
  masters,
  artists,
  contentFormats,
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
  contentFormats: ContentFormatOption[];
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
  const [priority, setPriority] = useState(defaults.priority ?? null);
  // The project's name takes the title of its only title (UX test of
  // 09/10/2026, « Titre du projet non repris du titre rattaché »), as long
  // as nobody typed another one.
  const [title, setTitle] = useState(values.title ?? defaults.title);
  const [titleFrom, setTitleFrom] = useState<string | null>(null);
  const typedTitle = title.trim() !== "" && title !== titleFrom;
  const [returned, setReturned] = useState(state);
  if (returned !== state) {
    setReturned(state);
    if (state.status === "error" && state.values?.title !== undefined)
      setTitle(state.values.title);
  }
  const formRef = useRef<HTMLFormElement>(null);
  const withDraft = !projectId && !onSaved;
  const plain = !withDraft;
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

  const music = type === "music_release";

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

      <FormSection title={t.sections.project} plain={plain}>
        <ProjectKindFields
          type={type}
          onTypeChange={setType}
          defaults={{
            musicFormat: defaults.musicFormat ?? null,
            contentMode: defaults.contentMode ?? null,
            contentFormatId: defaults.contentFormatId ?? null,
            artistId: defaults.artistId ?? null,
            masterIds: defaults.masterIds,
          }}
          masters={masters}
          artists={artists}
          contentFormats={contentFormats}
          errors={errors}
          onMastersChange={(chosen) => {
            if (typedTitle) return;
            const only = chosen.length === 1 ? chosen[0].title : null;
            setTitle(only ?? "");
            setTitleFrom(only);
          }}
        />
      </FormSection>

      <FormSection title={t.sections.details} plain={plain}>
        <Field
          name="title"
          label={t.fields.title}
          required
          autoComplete="off"
          maxLength={200}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          hint={
            titleFrom && title === titleFrom
              ? t.fields.titleFromMaster(titleFrom)
              : undefined
          }
          error={errors.title}
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            name="dueDate"
            type="date"
            label={music ? t.fields.releaseDate : t.fields.dueDate}
            hint={music ? t.fields.releaseDateHint : undefined}
            defaultValue={values.dueDate ?? defaults.dueDate ?? ""}
            error={errors.dueDate}
          />
          <Field
            name="budget"
            label={t.fields.budget}
            suffix="€"
            inputMode="decimal"
            autoComplete="off"
            maxLength={20}
            defaultValue={values.budget ?? defaults.budget ?? ""}
            error={errors.budget}
            className="h-10 pr-9 text-base tabular-nums md:text-sm"
          />
        </div>
        <ChipChoice
          name="priority"
          legend={t.fields.priority}
          options={PRIORITIES.map((value) => ({
            value,
            label: fr.shell.priorities[value],
          }))}
          value={priority}
          onChange={setPriority}
          deselectable
          hint={t.fields.priorityHint}
          error={errors.priority}
        />
        <TextareaField
          name="initialContext"
          label={t.fields.initialContext}
          hint={t.fields.initialContextHint}
          maxLength={20000}
          defaultValue={values.initialContext ?? defaults.initialContext ?? ""}
          error={errors.initialContext}
        />
      </FormSection>

      {!projectId && (
        <FormSection title={t.sections.team} plain={plain}>
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
        </FormSection>
      )}

      {state.status === "error" && state.formError && (
        <FormMessage kind="error">{state.formError}</FormMessage>
      )}

      {!projectId && (
        <p className="text-sm text-muted-foreground sm:text-right">
          {t.submitHint}
        </p>
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
