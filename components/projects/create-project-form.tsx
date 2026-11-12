"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { SubmitButton } from "@/components/auth/submit-button";
import { TextareaField } from "@/components/auth/textarea-field";
import { ProjectCoverField } from "@/components/projects/project-cover-field";
import { ProjectDraftControls } from "@/components/projects/project-draft-controls";
import {
  ProjectKindFields,
  type CollectiveMode,
} from "@/components/projects/project-kind-fields";
import { ProjectTeamFields } from "@/components/projects/project-team-fields";
import { useProjectDraft } from "@/components/projects/use-project-draft";
import { Button, buttonVariants, ButtonRoll } from "@/components/ui/button";
import { ChipChoice } from "@/components/ui/chip-choice";
import { FormSection } from "@/components/ui/form-section";
import { toast } from "@/components/ui/toast";
import { routes } from "@/lib/auth/redirects";
import type { ArtistOption, MasterOption } from "@/lib/catalog/types";
import type { CollectiveContext } from "@/lib/projects/collective-rules";
import { projectShell } from "@/lib/i18n/fr/project-shell";
import { shell } from "@/lib/i18n/fr/shell";
import { createProject } from "@/lib/projects/actions";
import type { CreativeMember } from "@/lib/projects/creatives";
import { updateProject } from "@/lib/projects/edit-actions";
import { uploadProjectCover } from "@/lib/projects/upload-cover";
import {
  PRIORITIES,
  idleCreateProjectState,
  type ContentFormatOption,
  type ContentMode,
  type MusicFormat,
  type Priority,
  type ProjectType,
} from "@/lib/projects/types";

const fr = { shell, projectShell };

export type ProjectFormDefaults = {
  title: string;
  type: ProjectType | null;
  musicFormat?: MusicFormat | null;
  contentMode?: ContentMode | null;
  contentFormatId?: string | null;
  artistId?: string | null;
  // « Projet collectif » (lot 5 of docs/pds-mic-plan.md).
  collective?: boolean;
  mainArtistId?: string | null;
  selectionId?: string | null;
  masterIds: string[];
  assigneePersonId?: string | null;
  creativePersonIds?: string[];
  masterValidatorPersonId?: string | null;
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
// with `onSaved` (modal, a PO draft) the page behind stays. Both show
// the sections without their cards. On the new project page, what is typed
// is kept as a draft (`draftId`: the one being resumed). `collectiveContext`
// offers « Projet collectif » (lot 5 of docs/pds-mic-plan.md); with its
// `holder`, the project is made from the viewer's selection and run by them
// (no draft: drafts belong to who creates projects).
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
  organizationId,
  collectiveContext = null,
  cancelHref = routes.projects,
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
  // Given on the creation page: the « Pochette » field, filed once the
  // project exists (storage path « <organization>/<project>/… »).
  organizationId?: string;
  collectiveContext?: CollectiveContext | null;
  // Where « Annuler » leads (the selection the project is made from).
  cancelHref?: string;
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
  const holder = projectId ? null : (collectiveContext?.holder ?? null);
  const collectiveMode: CollectiveMode | null = projectId
    ? defaults.collective
      ? "fixed"
      : null
    : holder
      ? "holder"
      : collectiveContext
        ? "choose"
        : null;
  const [collective, setCollective] = useState(
    Boolean(defaults.collective) || collectiveMode === "holder",
  );
  const [selectionId, setSelectionId] = useState(defaults.selectionId ?? null);
  const selection =
    collectiveContext?.selections.find((s) => s.id === selectionId) ?? null;
  // The project's name takes the title of its only title (UX test of
  // 09/10/2026, « Titre du projet non repris du titre rattaché »), or the
  // name of the selection it is made from, as long as nobody typed another.
  const [title, setTitle] = useState(values.title ?? defaults.title);
  const [titleFrom, setTitleFrom] = useState<{
    name: string;
    from: "master" | "selection";
  } | null>(
    selection && defaults.title === selection.name
      ? { name: selection.name, from: "selection" }
      : null,
  );
  const typedTitle = title.trim() !== "" && title !== titleFrom?.name;
  const [returned, setReturned] = useState(state);
  if (returned !== state) {
    setReturned(state);
    if (state.status === "error" && state.values?.title !== undefined)
      setTitle(state.values.title);
  }
  const formRef = useRef<HTMLFormElement>(null);
  const withDraft = !projectId && !onSaved && !holder;
  // In a modal, the sections lose their cards.
  const plain = Boolean(projectId) || Boolean(onSaved);
  const draft = useProjectDraft(formRef, resumedDraftId, withDraft);

  // A refused creation keeps the form, and its draft, going.
  const { pause } = draft;
  useEffect(() => {
    if (state.status === "error") pause(false);
  }, [state, pause]);

  // A refusal brings the reader to its first field in error (CLAUDE.md,
  // « Formulaires » 4): the message is never left out of view.
  useEffect(() => {
    if (state.status !== "error") return;
    const form = formRef.current;
    // A field, else the message of a picker in error (its FieldError).
    const first =
      form?.querySelector<HTMLElement>('[aria-invalid="true"]') ??
      form?.querySelector<HTMLElement>("p.text-error");
    first?.scrollIntoView({ block: "center" });
    first?.focus({ preventScroll: true });
  }, [state]);
  const errorCount = Object.values(errors).filter(Boolean).length;

  // The cover waits for the project to exist: the action then returns it
  // (intent « cover ») instead of redirecting, and the page opens after.
  const router = useRouter();
  const withCover = Boolean(organizationId) && !projectId;
  const [cover, setCover] = useState<File | null>(null);
  // Saved with a cover: it is being filed, then the project opens.
  const filing =
    state.status === "saved" && cover !== null && Boolean(organizationId);
  useEffect(() => {
    if (state.status !== "saved") return;
    const saved = state.project;
    const done = () =>
      onSaved ? onSaved(saved) : router.push(routes.project(saved.id));
    if (!cover || !organizationId) return done();
    void uploadProjectCover({
      organizationId,
      projectId: saved.id,
      file: cover,
    }).then((result) => {
      if (!result.ok) toast.warning(t.fields.coverFailed);
      done();
    });
    // onSaved changes identity on every render of the parent; the cover is
    // the one chosen when the form was sent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const music = type === "music_release";

  return (
    <form
      ref={formRef}
      action={action}
      // The created project deletes the draft: nothing is saved meanwhile.
      // While its cover is filed, the project exists: never sent twice.
      onSubmit={(event) => {
        if (filing) return event.preventDefault();
        pause(true);
      }}
      noValidate
      className="flex flex-col gap-5"
    >
      {onSaved ? (
        <input type="hidden" name="intent" value="dialog" />
      ) : (
        cover && <input type="hidden" name="intent" value="cover" />
      )}
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
            mainArtistId: defaults.mainArtistId ?? null,
            masterIds: defaults.masterIds,
          }}
          masters={masters}
          artists={artists}
          contentFormats={contentFormats}
          errors={errors}
          onMastersChange={(chosen) => {
            if (typedTitle) return;
            // A collective made from a selection keeps the selection's name.
            if (collective && selection) return;
            const only = chosen.length === 1 ? chosen[0].title : null;
            setTitle(only ?? "");
            setTitleFrom(only ? { name: only, from: "master" } : null);
          }}
          collective={collective}
          onCollectiveChange={setCollective}
          collectiveMode={collectiveMode}
          collectiveContext={collectiveContext}
          selectionId={selectionId}
          onSelectionChange={(next) => {
            setSelectionId(next?.id ?? null);
            if (typedTitle) return;
            setTitle(next?.name ?? "");
            setTitleFrom(next ? { name: next.name, from: "selection" } : null);
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
            titleFrom && title === titleFrom.name
              ? titleFrom.from === "selection"
                ? t.collective.titleFromSelection(titleFrom.name)
                : t.fields.titleFromMaster(titleFrom.name)
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
        {withCover && <ProjectCoverField file={cover} onFile={setCover} />}
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
            suggestedManagerId={
              collective ? (selection?.holder.personId ?? null) : null
            }
            self={holder}
            defaultCreativeIds={
              values.creativePersonIds
                ? parseIds(values.creativePersonIds)
                : (defaults.creativePersonIds ?? [])
            }
            withMasterValidator={music}
            defaultMasterValidatorId={
              values.masterValidatorPersonId ||
              defaults.masterValidatorPersonId ||
              null
            }
            errors={errors}
          />
        </FormSection>
      )}

      {state.status === "error" && state.formError && (
        <FormMessage kind="error">{state.formError}</FormMessage>
      )}
      {state.status === "error" && !state.formError && errorCount > 0 && (
        <FormMessage kind="error">{t.missingCount(errorCount)}</FormMessage>
      )}

      {!projectId && (
        <p className="text-sm text-muted-foreground sm:text-right">
          {holder ? t.collective.submitHint : t.submitHint}
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
            href={cancelHref}
            className={buttonVariants({ variant: "ghost", size: "lg" })}
          >
            <ButtonRoll>{t.cancel}</ButtonRoll>
          </Link>
        )}
        {projectId ? (
          <SubmitButton pendingLabel={t.saving}>{t.save}</SubmitButton>
        ) : (
          <SubmitButton
            pendingLabel={filing ? fr.projectShell.cover.saving : t.submitting}
            busy={filing}
          >
            {t.submit}
          </SubmitButton>
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
