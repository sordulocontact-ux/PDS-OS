"use client";

import { useState, type FormEvent } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { ContactCard } from "@/components/network/contact-card";
import { PersonPickerField } from "@/components/network/person-picker-field";
import { EmptyNote } from "@/components/shell/empty-state";
import { Button } from "@/components/ui/button";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { FormDialog } from "@/components/ui/form-dialog";
import { StatusBadge } from "@/components/ui/status-badge";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import {
  linkDealContact,
  unlinkDealContact,
} from "@/lib/deals/contact-actions";
import type { DealContact } from "@/lib/deals/contact-queries";
import { dealContacts } from "@/lib/i18n/fr/deal-contacts";
import { dialogs } from "@/lib/i18n/fr/dialogs";
import { listNetworkPeople } from "@/lib/network/people-actions";

const fr = { dealContacts, dialogs };
const t = fr.dealContacts;

function AddForm({ dealId, onDone }: { dealId: string; onDone: () => void }) {
  const { pending, error, run } = useWriteSubmit(onDone, t.linked);
  const [missing, setMissing] = useState(false);
  function submit(event: FormEvent<HTMLFormElement>) {
    // A contact added from the picker submits its own form (in a modal).
    if (event.target !== event.currentTarget) return;
    event.preventDefault();
    const contactId = String(
      new FormData(event.currentTarget).get("contactId") ?? "",
    );
    setMissing(!contactId);
    if (contactId) run(() => linkDealContact(dealId, contactId));
  }
  return (
    <form noValidate className="flex flex-col gap-5" onSubmit={submit}>
      <PersonPickerField
        refName="contactId"
        nameName="contactName"
        legend={t.contact}
        load={() => listNetworkPeople()}
        defaultRef={null}
        defaultName={null}
        createRoles={[]}
        refOfContact={(id) => id}
        allowNameOnly={false}
        required
        error={missing ? t.required : undefined}
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

function RemoveButton({ dealId, id }: { dealId: string; id: string }) {
  const { pending, run } = useWriteSubmit(undefined, t.unlinked);
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => run(() => unlinkDealContact(dealId, id))}
    >
      {t.remove}
    </Button>
  );
}

/**
 * The people of a deal (BIZ 8), one `ContactCard` each (Sacha 20/11/2026,
 * proto « Fiche d'un deal » v2): its roles, its e-mail when the reader may
 * read it (« Coordonnées privées » otherwise), « Voir la fiche ». Whoever
 * writes the deal adds a contact of the Réseau (PersonPickerField) or takes
 * one off; a private contact is shared by its owner or the direction only.
 */
export function DealContacts({
  dealId,
  contacts,
  canWrite,
}: {
  dealId: string;
  contacts: DealContact[];
  canWrite: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col items-start gap-3">
      {contacts.length === 0 ? (
        <EmptyNote>{t.empty}</EmptyNote>
      ) : (
        <div className="@container w-full">
          <div className="grid grid-cols-1 gap-3 @2xl:grid-cols-2">
            {contacts.map((c) => (
              <ContactCard
                key={c.id}
                name={c.name}
                kind="person"
                contactId={c.id}
                email={c.hidden ? null : c.email}
                hidden={c.hidden ? t.hidden : undefined}
                context={c.roles || undefined}
                action={
                  (c.isPrivate || canWrite) && (
                    <span className="flex items-center gap-2">
                      {c.isPrivate && (
                        <StatusBadge tone="neutral" size="sm">
                          {t.privateBadge}
                        </StatusBadge>
                      )}
                      {canWrite && <RemoveButton dealId={dealId} id={c.id} />}
                    </span>
                  )
                }
              />
            ))}
          </div>
        </div>
      )}
      {canWrite && (
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          {t.add}
        </Button>
      )}
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={t.addTitle}
        description={t.addDescription}
        closeLabel={fr.dialogs.close}
      >
        {open && <AddForm dealId={dealId} onDone={() => setOpen(false)} />}
      </FormDialog>
    </div>
  );
}
