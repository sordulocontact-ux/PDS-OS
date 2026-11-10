"use client";

import {
  IconEnvelopeOpen,
  IconPenWriting2,
  IconPhone,
  IconPlus,
  IconTrash,
} from "nucleo-sharp-essential";
import { useState } from "react";

import { ContactForm } from "@/components/catalog/artist-page/contact-form";
import { DeleteContactDialog } from "@/components/catalog/artist-page/delete-contact-dialog";
import { EmptyNote } from "@/components/shell/empty-state";
import { PageSection } from "@/components/shell/page-section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ArtistContact } from "@/lib/catalog/contacts";
import { catalog } from "@/lib/i18n/fr/catalog";

const fr = { catalog };

type Editing = { contact: ArtistContact | null } | null;

// Contacts of the artist (manager, booker…), primary first. Rendered only
// for manage_catalog: the database hides the contacts from anyone else.
// On its own card, in the overview's side column.
export function ArtistContacts({
  artistId,
  contacts,
}: {
  artistId: string;
  contacts: ArtistContact[];
}) {
  const t = fr.catalog.contacts;
  const [editing, setEditing] = useState<Editing>(null);
  const [deleting, setDeleting] = useState<ArtistContact | null>(null);

  return (
    <PageSection
      card
      id="contacts"
      title={t.title}
      action={
        <Button
          variant="outline"
          size="sm"
          onClick={() => setEditing({ contact: null })}
        >
          <IconPlus aria-hidden data-icon="inline-start" />
          {t.add}
        </Button>
      }
    >
      {contacts.length === 0 ? (
        <EmptyNote>{t.empty}</EmptyNote>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {contacts.map((contact) => (
            <li key={contact.id} className="flex items-start gap-3 p-4">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">{contact.name}</span>
                  {contact.isPrimary && (
                    <Badge variant="secondary">{t.primary}</Badge>
                  )}
                </div>
                <span className="text-caption text-muted-foreground">
                  {t.roles[contact.role]}
                </span>
                {contact.email && (
                  <a
                    href={`mailto:${contact.email}`}
                    className="flex w-fit min-w-0 items-center gap-1.5 text-sm break-all hover:underline"
                  >
                    <IconEnvelopeOpen
                      className="size-4 shrink-0 text-muted-foreground"
                      aria-hidden
                    />
                    {contact.email}
                  </a>
                )}
                {contact.phone && (
                  <a
                    href={`tel:${contact.phone.replace(/[^0-9+]/g, "")}`}
                    className="flex w-fit items-center gap-1.5 text-sm tabular-nums hover:underline"
                  >
                    <IconPhone
                      className="size-4 shrink-0 text-muted-foreground"
                      aria-hidden
                    />
                    {contact.phone}
                  </a>
                )}
              </div>
              <div className="-my-1 -mr-2 flex shrink-0">
                <Button
                  variant="ghost"
                  size="icon-lg"
                  aria-label={t.edit(contact.name)}
                  onClick={() => setEditing({ contact })}
                >
                  <IconPenWriting2 className="size-5" aria-hidden />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-lg"
                  aria-label={t.remove(contact.name)}
                  onClick={() => setDeleting(contact)}
                >
                  <IconTrash className="size-5" aria-hidden />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
      >
        <DialogContent closeLabel={t.form.close}>
          <DialogHeader>
            <DialogTitle>
              {editing?.contact ? t.form.editTitle : t.form.addTitle}
            </DialogTitle>
            <DialogDescription>{t.form.description}</DialogDescription>
          </DialogHeader>
          {/* Mounted per opening: every opening starts from a clean form. */}
          {editing && (
            <ContactForm
              artistId={artistId}
              contact={editing.contact}
              onDone={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <DeleteContactDialog
        artistId={artistId}
        contact={deleting}
        onClose={() => setDeleting(null)}
      />
    </PageSection>
  );
}
