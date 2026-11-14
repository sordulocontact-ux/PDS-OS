"use client";

import { useState } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { OptionSelect } from "@/components/projects/option-select";
import { Button } from "@/components/ui/button";
import { ChipMultiChoice } from "@/components/ui/chip-choice";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { FormDialog } from "@/components/ui/form-dialog";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { dialogs } from "@/lib/i18n/fr/dialogs";
import { masterFileRequests } from "@/lib/i18n/fr/master-file-requests";
import { requestMasterFiles } from "@/lib/master-workflow/file-request-actions";

const fr = { dialogs, masterFileRequests };
const t = fr.masterFileRequests;

/** A title waiting for its source, as the dialog offers it. */
export type RequestableTitle = {
  // Its project title (the line's key).
  titleId: string;
  label: string;
  // Already asked of someone: their name.
  askedOf: string | null;
};

export type RequestRecipient = {
  personId: string;
  name: string;
  reason: string;
};

/**
 * « Demander des fichiers » beside the Master's overview of a collective
 * (lot 9 bis): titles waiting for their source, one person, a message; one
 * line per title in the database. For the project's owner.
 */
export function RequestFilesButton({
  projectId,
  titles,
  recipients,
}: {
  projectId: string;
  titles: RequestableTitle[];
  recipients: RequestRecipient[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="self-start"
        onClick={() => setOpen(true)}
      >
        {t.button}
      </Button>
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={t.title}
        description={t.description}
        closeLabel={fr.dialogs.close}
      >
        {open && (
          <RequestFilesForm
            projectId={projectId}
            titles={titles}
            recipients={recipients}
            onDone={() => setOpen(false)}
          />
        )}
      </FormDialog>
    </>
  );
}

function RequestFilesForm({
  projectId,
  titles,
  recipients,
  onDone,
}: {
  projectId: string;
  titles: RequestableTitle[];
  recipients: RequestRecipient[];
  onDone: () => void;
}) {
  // The titles nobody was asked for yet, ticked at first.
  const [picked, setPicked] = useState<string[]>(
    titles.filter((x) => !x.askedOf).map((x) => x.titleId),
  );
  const [person, setPerson] = useState<string | null>(null);
  const [missing, setMissing] = useState<"titles" | "person" | null>(null);
  const { pending, error, run } = useWriteSubmit(onDone, t.title);
  if (recipients.length === 0)
    return (
      <div className="flex flex-col gap-4">
        <FormMessage kind="error">{t.noRecipient}</FormMessage>
        <div>
          <Button variant="ghost" size="lg" onClick={onDone}>
            {fr.dialogs.close}
          </Button>
        </div>
      </div>
    );
  const name = (id: string | null) =>
    recipients.find((r) => r.personId === id)?.name ?? "";
  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (picked.length === 0) return setMissing("titles");
        if (!person) return setMissing("person");
        const note = String(
          new FormData(event.currentTarget).get("note") ?? "",
        );
        // Titles already asked of this very person stay as they are.
        const opened = picked.filter(
          (id) =>
            titles.find((x) => x.titleId === id)?.askedOf !== name(person),
        ).length;
        run(
          () =>
            requestMasterFiles({
              projectId,
              titleIds: picked,
              personId: person,
              note,
            }),
          t.done(name(person), opened),
        );
      }}
    >
      <ChipMultiChoice
        name="titleIds"
        legend={t.titles}
        required
        options={titles.map((x) => ({
          value: x.titleId,
          label: x.askedOf ? t.titleAsked(x.label, x.askedOf) : x.label,
        }))}
        value={picked}
        onChange={(next) => {
          setPicked(next);
          setMissing(null);
        }}
        summary={t.picked}
        error={missing === "titles" ? t.errors.titlesRequired : undefined}
      />
      <OptionSelect
        id="file-request-person"
        name="personId"
        label={t.person}
        placeholder={t.personPlaceholder}
        required
        items={Object.fromEntries(
          recipients.map((r) => [
            r.personId,
            `${r.name} · ${t.reasons[r.reason] ?? r.reason}`,
          ]),
        )}
        onValueChange={(next) => {
          setPerson(next);
          setMissing(null);
        }}
        error={missing === "person" ? t.errors.personRequired : undefined}
      />
      <TextareaField
        name="note"
        label={t.note}
        placeholder={t.notePlaceholder}
        maxLength={1000}
        rows={3}
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
