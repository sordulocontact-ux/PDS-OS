"use client";

import {
  isReleaseValue,
  type ReleaseValue,
} from "@/components/projects/titles/recap-edits-words";
import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { NegotiationCallDialog } from "@/components/deals/negotiation-call-button";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { FormDialog } from "@/components/ui/form-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import {
  negotiationCallData,
  type SharedNegotiationCall,
} from "@/lib/deals/negotiation-call-rules";
import { dialogs } from "@/lib/i18n/fr/dialogs";
import { projectTitles } from "@/lib/i18n/fr/project-titles";
import { setParticipationNote } from "@/lib/projects/participation-actions";
import type { RecapAccord } from "@/lib/projects/recap-rules";

// What the collective's recap edits (retours d'Ibé du 18/11/2026, lot 2:
// « contact, sortie oui / non, notes », nothing that has a module), from
// the artist's side sheet since 27/11/2026 (nothing is edited in the
// table): the release of a title, the note of an artist, and « Caler le
// call » (Sacha's dialog, also in the row's « ⋯ »). The contact:
// recap-contact-dialog.tsx.

const fr = { dialogs, projectTitles };

// ----------------------------------------------------------------- Release

/** « Sortie » of a title: Oui / Non / Pas décidé, saved at the choice
 * (setTitleRelease, in the side sheet's « Titre »); read only, its word. A 32 px menu, the
 * height of a row's menu (docs/DESIGN.md « Hauteur d'un champ »): three
 * segments did not fit beside their label in the title's column. */
export function ReleaseChoice({
  label,
  value,
  canEdit,
  pending,
  onPick,
}: {
  label: string;
  value: ReleaseValue;
  canEdit: boolean;
  pending: boolean;
  onPick: (value: ReleaseValue) => void;
}) {
  const t = fr.projectTitles.recap.release;
  if (!canEdit)
    return (
      <span className="text-[color:var(--text-secondary)]">{t[value]}</span>
    );
  const items: Record<ReleaseValue, string> = {
    yes: t.yes,
    no: t.no,
    undecided: t.undecided,
  };
  return (
    <Select
      items={items}
      value={value}
      onValueChange={(next) => {
        if (isReleaseValue(next) && next !== value && !pending) onPick(next);
      }}
    >
      <SelectTrigger aria-label={t.label(label)} className="max-w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(items).map(([option, optionLabel]) => (
          <SelectItem key={option} value={option}>
            {optionLabel}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// -------------------------------------------------------------------- Note

/** « Note sur … » in its modal, opened from the artist's side sheet
 * (TitleArtistSheet, 27/11/2026: nothing is edited in the table). */
export function NoteDialog({
  open,
  onOpenChange,
  projectId,
  participationId,
  artist,
  note,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  participationId: string;
  artist: string;
  note: string | null;
}) {
  const t = fr.projectTitles.recap.note;
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t.title(artist)}
      closeLabel={fr.dialogs.close}
    >
      <NoteForm
        projectId={projectId}
        participationId={participationId}
        note={note}
        onDone={() => onOpenChange(false)}
      />
    </FormDialog>
  );
}

function NoteForm({
  projectId,
  participationId,
  note,
  onDone,
}: {
  projectId: string;
  participationId: string;
  note: string | null;
  onDone: () => void;
}) {
  const t = fr.projectTitles.recap.note;
  const { pending, error, run } = useWriteSubmit(onDone, t.done);
  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const value = String(
          new FormData(event.currentTarget).get("note") ?? "",
        ).trim();
        run(() =>
          setParticipationNote({
            projectId,
            participationId,
            note: value || null,
          }),
        );
      }}
    >
      <TextareaField
        name="note"
        label={t.label}
        hideLabel
        defaultValue={note ?? ""}
        rows={4}
        maxLength={2000}
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

// ------------------------------------------------------------ Caler le call

/** « Caler le call » of a row (Ibé 18/11, 1:00:28): the artist agreed and
 * no call is planned. Opened from the row's « ⋯ » or its side sheet (Maël
 * 25/11/2026: no button in the table). The shared data (negotiators'
 * slots, contacts) is given once to the board, the row's target computed
 * here. */
export function PlanCallDialog({
  shared,
  accord,
  open,
  onOpenChange,
}: {
  shared: SharedNegotiationCall | null;
  accord: RecapAccord;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!shared || !accord.call || !accord.showPlanCall) return null;
  const data = negotiationCallData(shared, accord.call);
  if (!data) return null;
  return (
    <NegotiationCallDialog
      data={data}
      open={open}
      onOpenChange={onOpenChange}
    />
  );
}

/** Whether a row may « Caler le call » (its « ⋯ » and its side sheet offer
 * it). */
export const plansCall = (
  shared: SharedNegotiationCall | null,
  accord: RecapAccord,
) =>
  Boolean(
    shared &&
    accord.call &&
    accord.showPlanCall &&
    negotiationCallData(shared, accord.call),
  );
