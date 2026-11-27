"use client";

import { useEffect, useRef, useState } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { OptionSelect } from "@/components/projects/option-select";
import { useOpenNote } from "@/components/notes/use-open-note";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { createNote, updateNote, type NoteField } from "@/lib/notes/actions";
import type { NoteProjectOption } from "@/lib/notes/options";
import { notes } from "@/lib/i18n/fr/notes";

const fr = { notes };

// The select's value for a note of the team (a select holds no null).
const NO_PROJECT = "none";

/** What a form starts from: a note being edited, or a draft (PO, a project). */
export type NoteFormValues = {
  title: string;
  body: string;
  projectId: string | null;
};

/**
 * A written note's form, to create or (with `note`) to change. `initial`:
 * what it starts from (a draft of PO, the project one is on), all of it
 * changeable; `projectId` fixes the project and hides its field (a project's
 * door). Created, the note opens in its sheet; `stay` (PO's panel) keeps the
 * page and the form, `onSaved` gets the id.
 * Missing fields turn red with their reason on the first try, the first one
 * takes the focus.
 */
export function NoteForm({
  projects,
  note,
  initial,
  projectId,
  stay = false,
  onSaved,
  onDone,
}: {
  projects: NoteProjectOption[];
  note?: { id: string } & NoteFormValues;
  initial?: Partial<NoteFormValues>;
  projectId?: string;
  stay?: boolean;
  // The note is saved: its id.
  onSaved?: (id: string) => void;
  // « Annuler », or the form is over.
  onDone: () => void;
}) {
  const t = fr.notes.form;
  const start = note ?? initial;
  const ref = useRef<HTMLFormElement>(null);
  const [fields, setFields] = useState<Partial<Record<NoteField, string>>>({});
  const savedId = useRef<string | null>(null);
  const openNote = useOpenNote();
  const { pending, error, run } = useWriteSubmit(
    () => {
      const id = savedId.current;
      if (id) {
        onSaved?.(id);
        // A new note opens in its sheet, unless PO's panel keeps the page.
        if (!note && !stay) openNote(id);
      }
      // PO's panel keeps its form (the card shows the note's id).
      if (!stay) onDone();
    },
    note ? t.saved : t.created,
  );

  // The first missing field takes the focus.
  useEffect(() => {
    const first = fields.title ? "title" : fields.body ? "body" : null;
    if (first) ref.current?.querySelector<HTMLElement>(`#${first}`)?.focus();
  }, [fields]);

  return (
    <form
      ref={ref}
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const chosen = projectId ?? String(data.get("projectId") ?? "");
        const input = {
          title: String(data.get("title") ?? ""),
          body: String(data.get("body") ?? ""),
          projectId: chosen && chosen !== NO_PROJECT ? chosen : null,
        };
        run(async () => {
          const result = note
            ? await updateNote({ ...input, id: note.id })
            : await createNote(input);
          setFields(result.ok ? {} : (result.fields ?? {}));
          if (result.ok) savedId.current = result.id;
          return result;
        });
      }}
    >
      <Field
        name="title"
        label={t.title}
        required
        maxLength={200}
        placeholder={t.titlePlaceholder}
        defaultValue={start?.title ?? ""}
        error={fields.title}
      />
      {!projectId && (
        <OptionSelect
          name="projectId"
          label={t.project}
          items={{
            [NO_PROJECT]: t.noProject,
            ...Object.fromEntries(projects.map((p) => [p.id, p.title])),
          }}
          defaultValue={start?.projectId ?? NO_PROJECT}
        />
      )}
      <TextareaField
        name="body"
        label={t.body}
        required
        rows={12}
        maxLength={20000}
        className="min-h-56"
        defaultValue={start?.body ?? ""}
        error={fields.body}
      />
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <DialogFormActions
        pending={pending}
        submitLabel={note ? t.save : t.submit}
        pendingLabel={t.saving}
        onCancel={onDone}
      />
    </form>
  );
}
