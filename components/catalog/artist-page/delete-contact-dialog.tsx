"use client";

import { useState, useTransition } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ArtistContact } from "@/lib/catalog/contacts";
import { deleteContact } from "@/lib/catalog/profile-actions";
import { catalog } from "@/lib/i18n/fr/catalog";

const fr = { catalog };

// Confirms a definitive deletion; stays open with the error if it fails.
export function DeleteContactDialog({
  artistId,
  contact,
  onClose,
}: {
  artistId: string;
  contact: ArtistContact | null;
  onClose: () => void;
}) {
  const t = fr.catalog.contacts;
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function close() {
    setError(null);
    onClose();
  }

  function confirm() {
    if (!contact) return;
    startTransition(async () => {
      const result = await deleteContact({ artistId, contactId: contact.id });
      if (result.ok) close();
      else setError(result.error);
    });
  }

  return (
    <Dialog open={contact !== null} onOpenChange={(open) => !open && close()}>
      <DialogContent closeLabel={t.form.close}>
        <DialogHeader>
          <DialogTitle>{t.confirmTitle}</DialogTitle>
          <DialogDescription>
            {contact ? t.confirmBody(contact.name) : ""}
          </DialogDescription>
        </DialogHeader>
        {error && <FormMessage kind="error">{error}</FormMessage>}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" size="lg" onClick={close}>
            {t.form.cancel}
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="lg"
            disabled={pending}
            aria-busy={pending || undefined}
            onClick={confirm}
          >
            {pending ? t.deleting : t.confirm}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
