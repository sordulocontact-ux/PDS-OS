"use client";

import {
  IconArrowDottedRotateAnticlockwise,
  IconBoxArchive,
  IconPenWriting2,
} from "nucleo-sharp-essential";
import { useState, useTransition } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { ContentCard } from "@/components/shell/content-card";
import { DialogButton } from "@/components/ui/dialog-button";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { FormDialog } from "@/components/ui/form-dialog";
import { Label } from "@/components/ui/label";
import { ReasonForm } from "@/components/ui/reason-form";
import { RowActions, type RowAction } from "@/components/ui/row-actions";
import { SearchSelect } from "@/components/ui/search-select";
import { toast } from "@/components/ui/toast";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { demos } from "@/lib/i18n/fr/demos";
import { dialogs } from "@/lib/i18n/fr/dialogs";
import { projectTitles } from "@/lib/i18n/fr/project-titles";
import {
  abandonProjectTitle,
  addProjectTitle,
  reactivateProjectTitle,
  renameProjectTitle,
} from "@/lib/projects/title-actions";
import {
  projectTitleLabel,
  type ProjectTitle,
} from "@/lib/projects/title-rules";
import { formatShortDay } from "@/lib/utils/day";
import { cn } from "@/lib/utils";

const fr = { demos, dialogs, projectTitles };

const caption =
  "block text-[length:var(--type-caption)] leading-[var(--type-caption-lh)] text-[color:var(--text-tertiary)]";

const NO_MASTER = "none";

const labelOf = (title: ProjectTitle) =>
  projectTitleLabel({
    position: title.position,
    workingTitle: title.workingTitle,
    masterTitle: title.master?.title ?? null,
  });

/** Under the name: why it was abandoned, else where it stands in the
 * Catalogue (its maquette's status when it is one). */
function detailOf(title: ProjectTitle, label: string): string {
  const t = fr.projectTitles;
  if (title.status === "abandoned" && title.abandonedAt && title.abandonReason)
    return t.abandonedOn(
      formatShortDay(title.abandonedAt, { bare: true }),
      title.abandonReason,
    );
  if (!title.master) return t.notInCatalog;
  const demo = title.master.demoStatus
    ? fr.demos.badge(fr.demos.statuses[title.master.demoStatus])
    : null;
  if (label === title.master.title) return demo ?? t.inCatalog;
  return demo
    ? t.catalogDemo(title.master.title, demo)
    : t.catalog(title.master.title);
}

/**
 * The titles of a collective project (docs/pds-mic-plan.md, lot 2), the
 * minimal list on its overview until the « Titres et artistes » view
 * (lot 6): one line per title — its name or « Titre 3 · sans nom », where it
 * stands in the Catalogue, its status in words (the overview shows no
 * pills) — and, for whoever writes the project, « Ajouter un titre » and
 * each line's « ⋯ »: rename, abandon (with its reason), reactivate. An
 * abandoned title stays listed, after the others.
 */
export function ProjectTitles({
  projectId,
  titles,
  canManage,
  masterOptions,
}: {
  projectId: string;
  titles: ProjectTitle[];
  canManage: boolean;
  // The Catalogue's titles not in the project yet: id → « Titre · Artistes ».
  masterOptions: Record<string, string>;
}) {
  const t = fr.projectTitles;
  return (
    <ContentCard title={t.title} quietTitle className="p-6">
      {titles.length === 0 ? (
        <p className="text-[length:var(--type-body-md)] leading-[var(--type-body-md-lh)] text-[color:var(--text-secondary)]">
          {t.empty}
        </p>
      ) : (
        <ul className="flex flex-col gap-1">
          {titles.map((title) => (
            <TitleRow
              key={title.id}
              projectId={projectId}
              title={title}
              canManage={canManage}
            />
          ))}
        </ul>
      )}
      {canManage && (
        <div>
          <DialogButton
            label={t.add.button}
            title={t.add.title}
            description={t.add.description}
          >
            {(close) => (
              <AddTitleForm
                projectId={projectId}
                masterOptions={masterOptions}
                onDone={close}
              />
            )}
          </DialogButton>
        </div>
      )}
    </ContentCard>
  );
}

function TitleRow({
  projectId,
  title,
  canManage,
}: {
  projectId: string;
  title: ProjectTitle;
  canManage: boolean;
}) {
  const t = fr.projectTitles;
  const label = labelOf(title);
  const abandoned = title.status === "abandoned";
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto_2rem] items-center gap-3.5 py-2">
      <span className="min-w-0">
        <span
          className={cn(
            "line-clamp-2 block text-[length:var(--type-body-md)] leading-[var(--type-body-md-lh)] break-words",
            abandoned && "text-[color:var(--text-secondary)]",
          )}
        >
          {label}
        </span>
        {/* Wraps rather than cut: on a phone « Maquette · En développement »
            lost its status. */}
        <span
          className={cn(caption, "line-clamp-2 break-words")}
          // The whole reason of an abandonment, when two lines cut it.
          title={abandoned ? (title.abandonReason ?? undefined) : undefined}
        >
          {detailOf(title, label)}
        </span>
      </span>
      <span className="text-[length:var(--type-body-md)] leading-[var(--type-body-md-lh)] text-[color:var(--text-secondary)]">
        {t.statuses[title.status]}
      </span>
      <span className="flex justify-end">
        {canManage && (
          <TitleActions projectId={projectId} title={title} label={label} />
        )}
      </span>
    </li>
  );
}

/** « ⋯ » of a title: rename and abandon in a modal (a gesture that asks a
 * saisie opens one), reactivate at once (nothing to ask). */
function TitleActions({
  projectId,
  title,
  label,
}: {
  projectId: string;
  title: ProjectTitle;
  label: string;
}) {
  const t = fr.projectTitles;
  const [open, setOpen] = useState<"rename" | "abandon" | null>(null);
  const [, startTransition] = useTransition();
  const close = () => setOpen(null);

  const actions: RowAction[] =
    title.status === "abandoned"
      ? [
          {
            key: "reactivate",
            label: t.reactivate.action,
            icon: IconArrowDottedRotateAnticlockwise,
            onSelect: () =>
              startTransition(async () => {
                const result = await reactivateProjectTitle({
                  projectId,
                  titleId: title.id,
                });
                if (!result.ok) return void toast.error(result.error);
                toast.success(t.reactivate.done);
              }),
          },
        ]
      : [
          {
            key: "rename",
            label: t.rename.action,
            icon: IconPenWriting2,
            onSelect: () => setOpen("rename"),
          },
          {
            key: "abandon",
            label: t.abandon.action,
            icon: IconBoxArchive,
            onSelect: () => setOpen("abandon"),
          },
        ];

  return (
    <>
      <RowActions label={t.menu(label)} actions={actions} />
      <FormDialog
        open={open === "rename"}
        onOpenChange={(next) => !next && close()}
        title={t.rename.title}
        description={t.rename.description}
        closeLabel={fr.dialogs.close}
      >
        <RenameTitleForm projectId={projectId} title={title} onDone={close} />
      </FormDialog>
      <FormDialog
        open={open === "abandon"}
        onOpenChange={(next) => !next && close()}
        title={t.abandon.title(label)}
        // Only a maquette in draft or in development becomes « abandonnée »;
        // a validated one keeps its status (décision 8).
        description={
          title.master?.demoStatus === "draft" ||
          title.master?.demoStatus === "developing"
            ? `${t.abandon.description} ${t.abandon.demoNote}`
            : t.abandon.description
        }
        closeLabel={fr.dialogs.close}
      >
        <ReasonForm
          label={t.abandon.reason}
          submitLabel={t.abandon.submit}
          doneMessage={t.abandon.done}
          run={(reason) =>
            abandonProjectTitle({ projectId, titleId: title.id, reason })
          }
          onDone={close}
        />
      </FormDialog>
    </>
  );
}

function AddTitleForm({
  projectId,
  masterOptions,
  onDone,
}: {
  projectId: string;
  masterOptions: Record<string, string>;
  onDone: () => void;
}) {
  const t = fr.projectTitles.add;
  const [masterId, setMasterId] = useState(NO_MASTER);
  const { pending, error, run } = useWriteSubmit(onDone, t.done);
  const options = { [NO_MASTER]: t.noMaster, ...masterOptions };
  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const name = String(
          new FormData(event.currentTarget).get("workingTitle") ?? "",
        ).trim();
        run(() =>
          addProjectTitle({
            projectId,
            workingTitle: name || null,
            masterId: masterId === NO_MASTER ? null : masterId,
          }),
        );
      }}
    >
      <Field name="workingTitle" label={t.name} maxLength={200} autoFocus />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="project-title-master">{t.master}</Label>
        <SearchSelect
          id="project-title-master"
          label={t.master}
          options={options}
          value={masterId}
          onChange={setMasterId}
          searchPlaceholder={t.masterSearch}
          emptyLabel={t.masterEmpty}
          fill
        />
        <p className="text-caption text-muted-foreground">{t.masterHint}</p>
      </div>
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <DialogFormActions
        pending={pending}
        submitLabel={t.submit}
        onCancel={onDone}
      />
    </form>
  );
}

function RenameTitleForm({
  projectId,
  title,
  onDone,
}: {
  projectId: string;
  title: ProjectTitle;
  onDone: () => void;
}) {
  const t = fr.projectTitles.rename;
  const { pending, error, run } = useWriteSubmit(onDone, t.done);
  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const name = String(
          new FormData(event.currentTarget).get("workingTitle") ?? "",
        ).trim();
        run(() =>
          renameProjectTitle({
            projectId,
            titleId: title.id,
            workingTitle: name,
          }),
        );
      }}
    >
      <Field
        name="workingTitle"
        label={fr.projectTitles.add.name}
        defaultValue={title.workingTitle ?? ""}
        // Left empty, the title takes its master's name back: said here.
        placeholder={title.master?.title}
        maxLength={200}
        autoFocus
      />
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <DialogFormActions
        pending={pending}
        submitLabel={t.submit}
        onCancel={onDone}
      />
    </form>
  );
}
