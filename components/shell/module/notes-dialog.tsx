"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/form-dialog";
import { fr } from "@/lib/i18n/fr";
import {
  openContradictions,
  stepChoiceKey,
  type StepChoice,
  type StepNote,
  type StepRef,
} from "@/lib/step-tools/model";

import { NoteForm } from "./note-form";
import { NoteGroup } from "./note-group";
import { NoteRow } from "./note-row";

const t = fr.stepTools;
const GROUPS = [
  "pending_decision",
  "to_confirm",
  "decided",
  "information",
] as const;

export type NotesDialogProps = {
  stepRef: StepRef;
  notes: StepNote[];
  steps?: StepChoice[];
  canDecide: boolean;
  canWrite: boolean;
};

/** The « Informations et décisions » modal (proto decisionsModal), opened by
 * its own button (`NotesDialogButton`) or by a chip (`AttentionChips`). */
export function NotesDialog({
  open,
  onOpenChange,
  ...props
}: NotesDialogProps & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t.notes.title}
      description={t.notes.intro}
      closeLabel={fr.dialogs.close}
      size="wide"
    >
      <NotesView {...props} />
    </FormDialog>
  );
}

export function NotesDialogButton({
  label = t.notes.open,
  variant = "outline",
  ...props
}: NotesDialogProps & {
  label?: string;
  variant?: "outline" | "ghost";
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        type="button"
        variant={variant}
        size="sm"
        onClick={() => setOpen(true)}
      >
        {label}
      </Button>
      <NotesDialog {...props} open={open} onOpenChange={setOpen} />
    </>
  );
}

/** Contradictions first, then by status, then what was discarded; the form
 * to note one more at the bottom (proto decisionsView). */
function NotesView({
  stepRef,
  notes,
  steps,
  canDecide,
  canWrite,
}: NotesDialogProps) {
  const [noting, setNoting] = useState(false);
  const label = new Map(steps?.map((s) => [s.key, s.label]));
  const contradictions = openContradictions(notes);
  const inside = new Set(contradictions.flat().map((n) => n.id));
  const live = notes.filter((n) => !inside.has(n.id));
  const row = (n: StepNote, contra: boolean) => (
    <NoteRow
      key={n.id}
      projectId={stepRef.projectId}
      note={n}
      stepLabel={label.get(stepChoiceKey(n))}
      inContradiction={contra}
      canDecide={canDecide}
    />
  );
  const old = live.filter((n) => n.discarded);
  return (
    <div className="flex flex-col gap-5">
      {contradictions.map((list) => (
        <NoteGroup key={list[0].id} title={t.notes.contradiction}>
          <ul>{list.map((n) => row(n, true))}</ul>
          <p className="text-caption text-muted-foreground">
            {t.notes.contradictionHint}
          </p>
        </NoteGroup>
      ))}
      {GROUPS.map((status) => {
        const list = live.filter((n) => n.status === status && !n.discarded);
        return list.length > 0 ? (
          <NoteGroup key={status} title={t.notes.groups[status]}>
            <ul>{list.map((n) => row(n, false))}</ul>
          </NoteGroup>
        ) : null;
      })}
      {old.length > 0 && (
        <NoteGroup title={t.notes.old}>
          <ul>{old.map((n) => row(n, false))}</ul>
        </NoteGroup>
      )}
      {notes.length === 0 && (
        <p className="text-muted-foreground">{t.notes.empty}</p>
      )}
      {canWrite &&
        (noting ? (
          <NoteForm
            stepRef={stepRef}
            steps={steps}
            notes={notes}
            onDone={() => setNoting(false)}
          />
        ) : (
          <div>
            <Button
              type="button"
              variant="outline"
              onClick={() => setNoting(true)}
            >
              {t.note}
            </Button>
          </div>
        ))}
    </div>
  );
}
