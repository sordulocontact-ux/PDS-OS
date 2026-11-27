"use client";

import { useState } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import {
  CreateContactForm,
  PickContactForm,
} from "@/components/projects/titles/recap-contact-forms";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { FormDialog } from "@/components/ui/form-dialog";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { dialogs } from "@/lib/i18n/fr/dialogs";
import { projectTitles } from "@/lib/i18n/fr/project-titles";
import { setContactPhone } from "@/lib/projects/participation-actions";
import type { RecapContact } from "@/lib/projects/recap-rules";

// « Contact de l'artiste » (retours d'Ibé du 18/11/2026, lot 2): who to
// call for an artist of a collective, changed in a modal opened from the
// artist's side sheet (TitleArtistSheet, 27/11/2026: nothing is edited in
// the table any more).

const fr = { dialogs, projectTitles };

export type ContactMode = "phone" | "pick" | "create";

/** What the reader may do of the contact: change its number in the Réseau
 * (manage_network, a contact of the Réseau), take another contact of the
 * Réseau (who writes the title), or add a new one (both). None: nothing to
 * open. */
export function contactModes(input: {
  contact: RecapContact | null;
  canManage: boolean;
  canEditNetwork: boolean;
}): ContactMode[] {
  return [
    ...(input.contact?.contactId &&
    !input.contact.hidden &&
    input.canEditNetwork
      ? (["phone"] as const)
      : []),
    ...(input.canManage ? (["pick"] as const) : []),
    ...(input.canManage && input.canEditNetwork ? (["create"] as const) : []),
  ];
}

/** « Contact de l'artiste » in its modal: one gesture at a time, chosen in
 * segments when there are several (the number first, once there is a
 * contact). */
export function ContactDialog({
  open,
  onOpenChange,
  projectId,
  participationId,
  contact,
  modes,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  participationId: string;
  contact: RecapContact | null;
  modes: ContactMode[];
}) {
  const t = fr.projectTitles.recap.contact;
  if (modes.length === 0) return null;
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t.title}
      closeLabel={fr.dialogs.close}
    >
      <ContactForm
        projectId={projectId}
        participationId={participationId}
        contact={contact}
        modes={modes}
        onDone={() => onOpenChange(false)}
      />
    </FormDialog>
  );
}

function ContactForm({
  projectId,
  participationId,
  contact,
  modes,
  onDone,
}: {
  projectId: string;
  participationId: string;
  contact: RecapContact | null;
  modes: ContactMode[];
  onDone: () => void;
}) {
  const t = fr.projectTitles.recap.contact;
  const [mode, setMode] = useState<ContactMode>(modes[0]);
  return (
    <div className="flex flex-col gap-4">
      {modes.length > 1 && (
        <SegmentedControl<ContactMode>
          aria-label={t.modesLabel}
          options={modes.map((value) => ({ value, label: t.modes[value] }))}
          value={mode}
          onChange={(next) => next && setMode(next)}
          fill
        />
      )}
      {mode === "phone" && contact?.contactId ? (
        <PhoneForm
          projectId={projectId}
          contactId={contact.contactId}
          name={contact.name}
          phone={contact.phone}
          onDone={onDone}
        />
      ) : mode === "pick" ? (
        <PickContactForm
          projectId={projectId}
          participationId={participationId}
          current={contact?.contactId ?? null}
          currentKind={contact?.kind ?? "manager"}
          onDone={onDone}
        />
      ) : (
        <CreateContactForm
          projectId={projectId}
          participationId={participationId}
          onDone={onDone}
        />
      )}
    </div>
  );
}

/** The contact's number, changed in the Réseau (« Numéro changé dans le
 * Réseau »); blank removes it. */
function PhoneForm({
  projectId,
  contactId,
  name,
  phone,
  onDone,
}: {
  projectId: string;
  contactId: string;
  name: string;
  phone: string | null;
  onDone: () => void;
}) {
  const t = fr.projectTitles.recap;
  const { pending, error, run } = useWriteSubmit(onDone, t.phoneChanged);
  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const value = String(
          new FormData(event.currentTarget).get("contactPhone") ?? "",
        );
        run(() => setContactPhone({ projectId, contactId, phone: value }));
      }}
    >
      <Field
        name="contactPhone"
        label={t.contact.phone(name)}
        type="tel"
        autoComplete="off"
        defaultValue={phone ?? ""}
        maxLength={40}
        autoFocus
      />
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <DialogFormActions
        pending={pending}
        submitLabel={t.contact.phoneSubmit}
        onCancel={onDone}
      />
    </form>
  );
}
