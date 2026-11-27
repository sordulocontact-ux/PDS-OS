"use client";

import { useState, type FormEvent } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { PersonPickerField } from "@/components/network/person-picker-field";
import { ChipChoice } from "@/components/ui/chip-choice";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { projectTitles } from "@/lib/i18n/fr/project-titles";
import {
  listNetworkPeople,
  type NetworkPersonOption,
} from "@/lib/network/people-actions";
import {
  createParticipationContact,
  setParticipationContact,
} from "@/lib/projects/participation-actions";
import {
  CONTACT_KINDS,
  contactLabelOf,
  type ContactKind,
} from "@/lib/projects/recap-rules";

// The two forms of « Contact de l'artiste » that choose who it is
// (ContactDialog): another contact of the Réseau, or a new one.

const fr = { projectTitles };

/** What the contact is for the artist: Manager, Producteur, Autre (the
 * participation's label, see CONTACT_KINDS). */
function KindChoice({
  value,
  onChange,
}: {
  value: ContactKind;
  onChange: (kind: ContactKind) => void;
}) {
  const t = fr.projectTitles.recap.contact;
  return (
    <ChipChoice<ContactKind>
      name="contactKind"
      legend={t.role}
      options={CONTACT_KINDS.map((kind) => ({
        value: kind,
        label: t.kinds[kind],
      }))}
      value={value}
      onChange={(next) => next && onChange(next)}
      fill
    />
  );
}

/** Another contact of the Réseau as the artist's interlocutor (the
 * Réseau's picker: search, or add one to the Réseau without leaving), and
 * what it is for the artist: the current one's kind, a manager of the
 * Réseau once picked. */
export function PickContactForm({
  projectId,
  participationId,
  current,
  currentKind,
  onDone,
}: {
  projectId: string;
  participationId: string;
  current: string | null;
  currentKind: ContactKind;
  onDone: () => void;
}) {
  const t = fr.projectTitles.recap.contact;
  const { pending, error, run } = useWriteSubmit(onDone, t.picked);
  const [missing, setMissing] = useState(false);
  const [kind, setKind] = useState<ContactKind>(currentKind);
  function submit(event: FormEvent<HTMLFormElement>) {
    // A contact added from the picker submits its own form (in a modal).
    if (event.target !== event.currentTarget) return;
    event.preventDefault();
    const contactId = String(
      new FormData(event.currentTarget).get("contactId") ?? "",
    );
    setMissing(!contactId);
    if (contactId)
      run(() =>
        setParticipationContact({
          projectId,
          participationId,
          contactId,
          label: contactLabelOf(kind),
        }),
      );
  }
  return (
    <form noValidate className="flex flex-col gap-4" onSubmit={submit}>
      <PersonPickerField
        refName="contactId"
        nameName="contactName"
        legend={t.pick}
        load={() => listNetworkPeople()}
        defaultRef={current}
        defaultName={null}
        createRoles={["manager"]}
        refOfContact={(id) => id}
        onPick={(option: NetworkPersonOption | null) =>
          option &&
          setKind(option.roles.includes("manager") ? "manager" : "other")
        }
        allowNameOnly={false}
        required
        error={missing ? t.pickRequired : undefined}
      />
      <KindChoice value={kind} onChange={setKind} />
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <DialogFormActions
        pending={pending}
        submitLabel={t.pickSubmit}
        onCancel={onDone}
      />
    </form>
  );
}

/** A new contact of the Réseau (name, number, and what it is for the artist:
 * a manager, a producer or another), made the artist's interlocutor. The
 * name is asked again in red when left empty. */
export function CreateContactForm({
  projectId,
  participationId,
  onDone,
}: {
  projectId: string;
  participationId: string;
  onDone: () => void;
}) {
  const t = fr.projectTitles.recap;
  const { pending, error, run } = useWriteSubmit(onDone, t.contact.created);
  const [missing, setMissing] = useState(false);
  const [kind, setKind] = useState<ContactKind>("manager");
  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const name = String(data.get("contactName") ?? "").trim();
        const phone = String(data.get("contactPhone") ?? "");
        setMissing(!name);
        if (!name)
          return void document.getElementById("recap-contact-name")?.focus();
        run(() =>
          createParticipationContact({
            projectId,
            participationId,
            name,
            phone,
            kind,
          }),
        );
      }}
    >
      <Field
        id="recap-contact-name"
        name="contactName"
        label={t.contact.name}
        required
        autoComplete="off"
        maxLength={200}
        autoFocus
        error={missing ? t.errors.nameRequired : undefined}
        onChange={() => setMissing(false)}
      />
      <Field
        name="contactPhone"
        label={t.contact.newPhone}
        type="tel"
        autoComplete="off"
        maxLength={40}
      />
      <KindChoice value={kind} onChange={setKind} />
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <DialogFormActions
        pending={pending}
        submitLabel={t.contact.createSubmit}
        onCancel={onDone}
      />
    </form>
  );
}
