"use client";

import { ContactForm } from "@/components/network/contact-form";
import { FormDialog } from "@/components/ui/form-dialog";
import { Loaded } from "@/components/ui/loaded";
import { fr } from "@/lib/i18n/fr";
import { loadContactOptions } from "@/lib/network/actions";
import type { NetworkKind, NetworkRole } from "@/lib/network/types";

function Body({
  name,
  email,
  roles,
  kind,
  onCreated,
  onCancel,
}: {
  name: string;
  email?: string;
  roles: NetworkRole[];
  kind: NetworkKind;
  onCreated: (id: string) => void;
  onCancel: () => void;
}) {
  return (
    <Loaded
      load={loadContactOptions}
      loadingLabel={fr.records.edit.loading}
      errorLabel={fr.records.edit.loadFailed}
    >
      {(data) => (
        <ContactForm
          options={data}
          initial={{ name, email, roles, kind }}
          stay
          onCancel={onCancel}
          onSaved={onCreated}
        />
      )}
    </Loaded>
  );
}

/** « Ajouter « X » au Réseau » from a form that stays open behind (a credit
 * of a title): the contact form, filled; the new contact comes back chosen. */
export function CreateContactDialog({
  open,
  onOpenChange,
  name,
  email,
  roles,
  kind = "person",
  title,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  // An address already typed (a participant invited by e-mail).
  email?: string;
  roles: NetworkRole[];
  kind?: NetworkKind;
  // Said by the caller (« Nouvelle fiche dans le Réseau » from a call).
  title?: string;
  onCreated: (id: string) => void;
}) {
  const t = fr.network.form;
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title ?? t.createTitle}
      description={t.createDescription}
      closeLabel={t.close}
    >
      {open && (
        <Body
          name={name}
          email={email}
          roles={roles}
          kind={kind}
          onCreated={onCreated}
          onCancel={() => onOpenChange(false)}
        />
      )}
    </FormDialog>
  );
}
