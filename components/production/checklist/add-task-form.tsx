"use client";

import { useState, type FormEvent } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { HolderSelect } from "@/components/production/holder-select";
import { Button } from "@/components/ui/button";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import type { Member } from "@/lib/framing/related";
import { fr } from "@/lib/i18n/fr";
import { addChecklistTask } from "@/lib/production/checklist-actions";
import type { NetworkOption } from "@/lib/production/sheet";

const t = fr.productionChecklist.add;

/** « Ajouter une tâche » (proto prep): what, who does it, by when; opened
 * in place on a soft card. `initial` + `stay`: opened prefilled. */
export function AddTaskForm({
  projectId,
  sheetId,
  members,
  contacts,
  initial,
}: {
  projectId: string;
  sheetId: string;
  members: Member[];
  contacts: NetworkOption[];
  initial?: { title?: string; holder?: string; due?: string };
}) {
  const [open, setOpen] = useState(Boolean(initial));
  const [holder, setHolder] = useState(initial?.holder ?? "");
  const [missing, setMissing] = useState(false);
  const { pending, error, run } = useWriteSubmit(() => setOpen(false), t.done);
  if (!open)
    return (
      <div>
        <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
          {t.open}
        </Button>
      </div>
    );
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const title = String(data.get("title") ?? "").trim();
    if (!title) return setMissing(true);
    run(() =>
      addChecklistTask({
        projectId,
        sheetId,
        title,
        holder,
        due: String(data.get("due") ?? ""),
      }),
    );
  }
  return (
    <form
      noValidate
      onSubmit={submit}
      className="flex flex-col gap-4 rounded-xl bg-[var(--surface-soft)] p-4"
    >
      <Field
        name="title"
        label={t.title}
        required
        maxLength={300}
        defaultValue={initial?.title}
        error={missing ? t.required : undefined}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <HolderSelect
          id="checklist-holder"
          label={t.who}
          noneLabel={t.nobody}
          value={holder}
          members={members}
          contacts={contacts}
          onChange={setHolder}
        />
        <Field
          name="due"
          label={t.due}
          type="date"
          defaultValue={initial?.due}
        />
      </div>
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          size="sm"
          disabled={pending}
          aria-busy={pending || undefined}
        >
          {t.submit}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setOpen(false)}
        >
          {fr.dialogs.cancel}
        </Button>
      </div>
    </form>
  );
}
