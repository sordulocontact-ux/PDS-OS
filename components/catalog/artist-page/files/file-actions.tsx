"use client";

import { IconTrash } from "nucleo-sharp-essential";
import { useState, useTransition } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { IconArrowDown } from "@/components/icons";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { deleteArtistFile } from "@/lib/catalog/file-actions";
import type { ArtistFile } from "@/lib/catalog/file-rules";
import { fr } from "@/lib/i18n/fr";

// Row actions: download (signed URL), and delete after confirmation for
// manage_catalog. The dialog stays open with the error if it fails.
export function FileActions({
  artistId,
  file,
  canDelete,
}: {
  artistId: string;
  file: ArtistFile;
  canDelete: boolean;
}) {
  const t = fr.artistFiles;
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function close() {
    setError(null);
    setOpen(false);
  }

  function confirm() {
    startTransition(async () => {
      const result = await deleteArtistFile({ artistId, fileId: file.id });
      if (result.ok) close();
      else setError(result.error);
    });
  }

  return (
    <div className="flex justify-end gap-1">
      {file.downloadUrl && (
        <a
          href={file.downloadUrl}
          aria-label={t.download(file.fileName)}
          className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
        >
          <IconArrowDown aria-hidden />
        </a>
      )}
      {canDelete && (
        <>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={t.remove(file.fileName)}
            onClick={() => setOpen(true)}
          >
            <IconTrash aria-hidden />
          </Button>
          <Dialog open={open} onOpenChange={(next) => !next && close()}>
            <DialogContent closeLabel={t.close}>
              <DialogHeader>
                <DialogTitle>{t.confirmTitle}</DialogTitle>
                <DialogDescription>
                  {t.confirmBody(file.fileName)}
                </DialogDescription>
              </DialogHeader>
              {error && <FormMessage kind="error">{error}</FormMessage>}
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="ghost" size="lg" onClick={close}>
                  {t.cancel}
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
        </>
      )}
    </div>
  );
}
