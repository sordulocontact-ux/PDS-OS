"use client";

import { IconPenWriting2, IconPlus } from "nucleo-sharp-essential";
import Link from "next/link";
import { useState } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { ArtistChoiceField } from "@/components/catalog/selections/artist-choice-field";
import { OptionSelect } from "@/components/projects/option-select";
import { Button, buttonVariants, ButtonRoll } from "@/components/ui/button";
import { DialogButton } from "@/components/ui/dialog-button";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { FormDialog } from "@/components/ui/form-dialog";
import { RowActions } from "@/components/ui/row-actions";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import {
  addArtistsToSelection,
  renameArtistSelection,
  transmitArtistSelection,
} from "@/lib/catalog/selection-actions";
import type { ArtistOption } from "@/lib/catalog/types";
import { artistSelections } from "@/lib/i18n/fr/artist-selections";
import { dialogs } from "@/lib/i18n/fr/dialogs";

const fr = { artistSelections, dialogs };

type Person = { personId: string; name: string };

/**
 * A selection's gestures, in its page's head, for who manages the Catalogue
 * (lot 4 of docs/pds-mic-plan.md): « Ajouter des artistes » (the main one),
 * « Transmettre » (to a member who manages the Catalogue, never its
 * holder), and « Renommer » in the « ⋯ ». Each asks a saisie: a modal.
 * Lot 5: « Créer le projet » (`createProjectHref`, the direction and its
 * holder, once it has artists) opens the project form on this selection;
 * it is then the main gesture, « Ajouter des artistes » in outline.
 */
export function SelectionActions({
  selectionId,
  name,
  holderPersonId,
  artists,
  inSelection,
  recipients,
  emptySelection,
  createProjectHref = null,
}: {
  selectionId: string;
  name: string;
  holderPersonId: string;
  // Every live artist of the Catalogue; those already in it are not offered.
  artists: ArtistOption[];
  inSelection: string[];
  recipients: Person[];
  // No artist yet: « Ajouter des artistes » is in the empty state instead.
  emptySelection: boolean;
  createProjectHref?: string | null;
}) {
  const t = fr.artistSelections;
  const [renaming, setRenaming] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-2">
      {createProjectHref && (
        <Link
          href={createProjectHref}
          className={buttonVariants({ variant: "default", size: "lg" })}
        >
          <ButtonRoll>{t.createProject}</ButtonRoll>
        </Link>
      )}
      {!emptySelection && (
        <AddArtistsButton
          selectionId={selectionId}
          artists={artists}
          inSelection={inSelection}
          variant={createProjectHref ? "outline" : "default"}
        />
      )}
      <DialogButton
        label={t.transmit.button}
        variant="outline"
        size="lg"
        title={t.transmit.title}
        description={t.transmit.description}
      >
        {(close) => (
          <TransmitForm
            selectionId={selectionId}
            recipients={recipients.filter((p) => p.personId !== holderPersonId)}
            onDone={close}
          />
        )}
      </DialogButton>
      <RowActions
        label={t.selectionMenu}
        size="icon-lg"
        actions={[
          {
            key: "rename",
            label: t.rename.action,
            icon: IconPenWriting2,
            onSelect: () => setRenaming(true),
          },
        ]}
      />
      <FormDialog
        open={renaming}
        onOpenChange={setRenaming}
        title={t.rename.title}
        description={t.rename.description}
        closeLabel={fr.dialogs.close}
      >
        {renaming && (
          <RenameForm
            selectionId={selectionId}
            name={name}
            onDone={() => setRenaming(false)}
          />
        )}
      </FormDialog>
    </div>
  );
}

/** « Ajouter des artistes »: the main gesture of a selection's page, also
 * the action of its empty state. */
export function AddArtistsButton({
  selectionId,
  artists,
  inSelection,
  variant = "default",
}: {
  selectionId: string;
  artists: ArtistOption[];
  inSelection: string[];
  // Outline next to « Créer le projet » (one main gesture per head).
  variant?: "default" | "outline";
}) {
  const t = fr.artistSelections.add;
  return (
    <DialogButton
      label={t.button}
      icon={IconPlus}
      variant={variant}
      size="lg"
      title={t.title}
      description={t.description}
    >
      {(close) => (
        <AddArtistsForm
          selectionId={selectionId}
          artists={artists}
          inSelection={inSelection}
          onDone={close}
        />
      )}
    </DialogButton>
  );
}

function AddArtistsForm({
  selectionId,
  artists,
  inSelection,
  onDone,
}: {
  selectionId: string;
  artists: ArtistOption[];
  inSelection: string[];
  onDone: () => void;
}) {
  const t = fr.artistSelections.add;
  const [chosen, setChosen] = useState<ArtistOption[]>([]);
  const [missing, setMissing] = useState(false);
  const { pending, error, run } = useWriteSubmit(onDone, t.done(chosen.length));
  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        setMissing(chosen.length === 0);
        if (chosen.length === 0) return;
        run(() =>
          addArtistsToSelection({
            selectionId,
            artistIds: chosen.map((a) => a.id),
          }),
        );
      }}
    >
      <ArtistChoiceField
        artists={artists}
        excludedIds={new Set(inSelection)}
        value={chosen}
        onChange={(next) => {
          setChosen(next);
          if (next.length > 0) setMissing(false);
        }}
        required
        error={missing ? t.required : undefined}
        // The modal focuses the search on opening: its list waits for a
        // click or a key, rather than covering « Ajouter ».
        openOnFocus={false}
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

function TransmitForm({
  selectionId,
  recipients,
  onDone,
}: {
  selectionId: string;
  recipients: Person[];
  onDone: () => void;
}) {
  const t = fr.artistSelections.transmit;
  const [personId, setPersonId] = useState("");
  const [missing, setMissing] = useState(false);
  const { pending, error, run } = useWriteSubmit(onDone, t.submit);

  if (recipients.length === 0)
    return (
      <div className="flex flex-col gap-4">
        <p className="text-[length:var(--type-body-md)] leading-[var(--type-body-md-lh)] text-[color:var(--text-secondary)]">
          {t.noRecipient}
        </p>
        <div>
          <Button type="button" variant="outline" size="lg" onClick={onDone}>
            {fr.dialogs.close}
          </Button>
        </div>
      </div>
    );

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const person = recipients.find((p) => p.personId === personId);
        setMissing(!person);
        if (!person)
          return void document.getElementById("selection-recipient")?.focus();
        run(() =>
          transmitArtistSelection({
            selectionId,
            personId: person.personId,
            personName: person.name,
          }),
        );
      }}
    >
      <div className="flex flex-col gap-1.5">
        <OptionSelect
          id="selection-recipient"
          name="recipient"
          label={t.recipient}
          required
          placeholder={t.placeholder}
          items={Object.fromEntries(
            recipients.map((p) => [p.personId, p.name]),
          )}
          onValueChange={(value) => {
            setPersonId(value);
            setMissing(false);
          }}
          error={missing ? t.required : undefined}
        />
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

function RenameForm({
  selectionId,
  name,
  onDone,
}: {
  selectionId: string;
  name: string;
  onDone: () => void;
}) {
  const t = fr.artistSelections.rename;
  const [missing, setMissing] = useState(false);
  const { pending, error, run } = useWriteSubmit(onDone, t.done);
  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const next = String(
          new FormData(event.currentTarget).get("name") ?? "",
        ).trim();
        setMissing(!next);
        if (!next)
          return void document.getElementById("selection-rename")?.focus();
        run(() => renameArtistSelection({ selectionId, name: next }));
      }}
    >
      <Field
        id="selection-rename"
        // Back to normal as soon as it is filled (docs/DESIGN.md).
        onChange={(event) =>
          event.currentTarget.value.trim() && setMissing(false)
        }
        name="name"
        label={fr.artistSelections.new.name}
        required
        defaultValue={name}
        maxLength={120}
        autoFocus
        autoComplete="off"
        error={missing ? fr.artistSelections.new.nameRequired : undefined}
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
