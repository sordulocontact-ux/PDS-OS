"use client";

import { IconFile, IconTrash } from "nucleo-sharp-essential";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { useCatalogUpload } from "@/components/catalog/files/use-catalog-upload";
import { EmptyNote } from "@/components/shell/empty-state";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FileDropZone } from "@/components/ui/file-drop-zone";
import { toast } from "@/components/ui/toast";
import { deleteCatalogFile } from "@/lib/catalog/file-actions";
import {
  type CatalogFile,
  canWriteFile,
  type FileWriteScope,
  isShownImage,
} from "@/lib/catalog/file-rules";
import { artistIdentity } from "@/lib/i18n/fr/artist-identity";
import { formatInstantDay } from "@/lib/utils/instant";

const fr = { artistIdentity };

// What a moodboard is dropped as: a picture the browser shows, or a PDF.
const ACCEPT = "image/png,image/jpeg,image/webp,image/gif,application/pdf";

/**
 * « Moodboards » of the Identité tab: the artistic director's boards,
 * dropped as they are (an image or a PDF), newest first, each opened full
 * size. Files of the artist's library, category « moodboard »: outside the
 * identity's versions. `organizationId`: whoever may drop (the Catalogue,
 * the creative directors); `scope`: a creative director edits his own only.
 */
export function IdentityMoodboards({
  artistId,
  files,
  organizationId,
  scope,
}: {
  artistId: string;
  files: CatalogFile[];
  organizationId: string | null;
  scope: FileWriteScope | null;
}) {
  const t = fr.artistIdentity.moodboards;
  const router = useRouter();
  const owner = { kind: "artist", id: artistId } as const;
  const upload = useCatalogUpload();
  const [sending, setSending] = useState(0);
  const [deleting, setDeleting] = useState<CatalogFile | null>(null);
  const [deletePending, startDelete] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const nameOf = (file: CatalogFile) => file.description ?? file.fileName;

  const send = (picked: File[]) => {
    if (!organizationId || picked.length === 0) return;
    setSending(picked.length);
    upload.run(
      picked,
      (file) => ({ organizationId, owner, category: "moodboard", file }),
      (failed, lastError) => {
        setSending(0);
        const sent = picked.length - failed.length;
        if (sent > 0) toast.success(t.sent(sent));
        if (lastError) toast.error(lastError);
        router.refresh();
      },
    );
  };

  return (
    <div className="flex flex-col gap-4">
      {organizationId && (
        <FileDropZone
          label={upload.pending ? t.sending(upload.done, sending) : t.drop}
          hint={t.dropHint}
          accept={ACCEPT}
          multiple
          disabled={upload.pending}
          onFiles={send}
        />
      )}

      {files.length === 0 ? (
        !organizationId && <EmptyNote>{t.empty}</EmptyNote>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {files.map((file) => (
            <li
              key={file.id}
              className="group relative flex min-w-0 flex-col overflow-hidden rounded-xl border border-[color:var(--border-hairline)] bg-card"
            >
              <a
                href={file.openUrl ?? undefined}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t.open(nameOf(file))}
                className="flex aspect-[4/3] items-center justify-center bg-muted/40"
              >
                {file.openUrl && isShownImage(file.mime) ? (
                  // eslint-disable-next-line @next/next/no-img-element -- a short-lived signed URL, not an optimisable asset
                  <img
                    src={file.openUrl}
                    alt=""
                    className="size-full object-cover"
                  />
                ) : (
                  <IconFile
                    aria-hidden
                    className="size-10 text-muted-foreground"
                  />
                )}
              </a>
              <div className="flex items-start gap-2 px-3 py-2">
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-medium">
                    {nameOf(file)}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {t.by(formatInstantDay(file.createdAt), file.authorName)}
                  </span>
                </div>
                {organizationId && canWriteFile(file, scope) && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t.remove(nameOf(file))}
                    onClick={() => setDeleting(file)}
                  >
                    <IconTrash aria-hidden />
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (open) return;
          setDeleteError(null);
          setDeleting(null);
        }}
        title={t.confirm.title}
        description={deleting ? t.confirm.body(nameOf(deleting)) : ""}
        cancelLabel={t.confirm.cancel}
        closeLabel={t.confirm.close}
        confirmLabel={t.confirm.confirm}
        pendingLabel={t.confirm.deleting}
        pending={deletePending}
        destructive
        error={deleteError}
        onConfirm={() => {
          if (!deleting) return;
          startDelete(async () => {
            const result = await deleteCatalogFile({
              owner,
              fileId: deleting.id,
            });
            if (!result.ok) return setDeleteError(result.error);
            toast.success(t.confirm.deleted);
            setDeleting(null);
            router.refresh();
          });
        }}
      />
    </div>
  );
}
