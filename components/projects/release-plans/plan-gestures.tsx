"use client";

import { IconBoxArchive, IconPenWriting2 } from "nucleo-sharp-essential";
import { useState } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { Button } from "@/components/ui/button";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { FormDialog } from "@/components/ui/form-dialog";
import { RowActions, type RowAction } from "@/components/ui/row-actions";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { dialogs } from "@/lib/i18n/fr/dialogs";
import { titleReleasePlans } from "@/lib/i18n/fr/title-release-plans";
import {
  recordTitlePlanVersion,
  setTitlePlanStatus,
} from "@/lib/projects/title-plan/actions";
import {
  gesturesOf,
  type TitlePlanGesture,
  type TitlePlanStatus,
} from "@/lib/projects/title-plan/model";

const fr = { dialogs, titleReleasePlans };
const t = fr.titleReleasePlans;

type Props = {
  projectId: string;
  titleId: string;
  planId: string;
  status: TitlePlanStatus;
  statusBefore: TitlePlanStatus | null;
  archivedReason: "title_abandoned" | "closed" | null;
  titleAbandoned: boolean;
  hasDate: boolean;
};

/**
 * The head of a title's plan (lot 14): its next status as the main button,
 * the other gestures in « ⋯ ». Recording a version and archiving ask first
 * (a note; the review, required); the other moves are one click, the
 * database refusing a status that changed in between.
 */
export function PlanGestures(props: Props) {
  const { primary, others } = gesturesOf(props);
  const [dialog, setDialog] = useState<
    "record_internal" | "record_revised" | "archive" | null
  >(null);
  const direct = useWriteSubmit(undefined, "");
  const gesture = (g: TitlePlanGesture) => {
    if (g === "record_internal" || g === "record_revised" || g === "archive")
      return setDialog(g);
    const to =
      g === "provisional"
        ? "provisional"
        : g === "ready"
          ? "ready_to_share"
          : g === "activate"
            ? "active"
            : props.statusBefore;
    if (!to) return;
    direct.run(
      () => setTitlePlanStatus(props.projectId, props.planId, props.status, to),
      t.gestureDone[g],
    );
  };
  const reopenBlocked = primary === "reopen" && props.titleAbandoned;
  const label = (g: TitlePlanGesture) =>
    g === "record_internal" && props.status === "internal"
      ? t.gestures.record_internal_again
      : t.gestures[g];
  const menu: RowAction[] = others.map((g) => ({
    key: g,
    label: label(g),
    icon: g === "archive" ? IconBoxArchive : IconPenWriting2,
    onSelect: () => gesture(g),
  }));
  return (
    <div className="flex flex-wrap items-center gap-2">
      {primary && !reopenBlocked && (
        <Button
          disabled={
            direct.pending || (primary === "provisional" && !props.hasDate)
          }
          onClick={() => gesture(primary)}
        >
          {label(primary)}
        </Button>
      )}
      <RowActions label={t.gestures.more} actions={menu} size="icon-lg" />
      {direct.error && (
        <FormMessage kind="error" className="w-full">
          {direct.error}
        </FormMessage>
      )}
      <FormDialog
        open={dialog === "record_internal" || dialog === "record_revised"}
        onOpenChange={(open) => !open && setDialog(null)}
        title={
          dialog === "record_revised"
            ? t.record.revisedTitle
            : t.record.internalTitle
        }
        description={t.record.description}
        closeLabel={fr.dialogs.close}
      >
        {(dialog === "record_internal" || dialog === "record_revised") && (
          <RecordForm
            {...props}
            revised={dialog === "record_revised"}
            onDone={() => setDialog(null)}
          />
        )}
      </FormDialog>
      <FormDialog
        open={dialog === "archive"}
        onOpenChange={(open) => !open && setDialog(null)}
        title={t.archive.title}
        description={t.archive.description}
        closeLabel={fr.dialogs.close}
      >
        {dialog === "archive" && (
          <ArchiveForm {...props} onDone={() => setDialog(null)} />
        )}
      </FormDialog>
    </div>
  );
}

function RecordForm({
  projectId,
  titleId,
  status,
  revised,
  onDone,
}: Props & { revised: boolean; onDone: () => void }) {
  const { pending, error, run } = useWriteSubmit(
    onDone,
    revised ? t.gestureDone.record_revised : t.gestureDone.record_internal,
  );
  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const note = String(
          new FormData(event.currentTarget).get("note") ?? "",
        );
        run(() => recordTitlePlanVersion(projectId, titleId, status, note));
      }}
    >
      <TextareaField
        id="plan-version-note"
        name="note"
        label={t.record.note}
        maxLength={1000}
        placeholder={
          revised
            ? t.record.notePlaceholderRevised
            : t.record.notePlaceholderInternal
        }
      />
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <DialogFormActions
        pending={pending}
        submitLabel={t.record.submit}
        onCancel={onDone}
      />
    </form>
  );
}

function ArchiveForm({
  projectId,
  planId,
  status,
  onDone,
}: Props & { onDone: () => void }) {
  const [fieldError, setFieldError] = useState<string | null>(null);
  const { pending, error, run } = useWriteSubmit(onDone, t.gestureDone.archive);
  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const note = String(
          new FormData(event.currentTarget).get("note") ?? "",
        ).trim();
        if (!note) return setFieldError(t.archive.noteRequired);
        run(() =>
          setTitlePlanStatus(projectId, planId, status, "archived", note),
        );
      }}
    >
      <TextareaField
        id="plan-archive-note"
        name="note"
        label={t.archive.note}
        required
        maxLength={1000}
        placeholder={t.archive.notePlaceholder}
        error={fieldError ?? undefined}
        onChange={() => setFieldError(null)}
      />
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <DialogFormActions
        pending={pending}
        submitLabel={t.archive.submit}
        onCancel={onDone}
      />
    </form>
  );
}
