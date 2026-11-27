"use client";

import {
  IconChevronLeft,
  IconFile,
  IconPenWriting2,
  IconTrash,
} from "nucleo-sharp-essential";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { IconArrowUpRight } from "@/components/icons";
import { MoodboardForm } from "@/components/catalog/identity/moodboard-forms";
import { useCatalogUpload } from "@/components/catalog/files/use-catalog-upload";
import { EmptyNote } from "@/components/shell/empty-state";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FileDropZone } from "@/components/ui/file-drop-zone";
import { FormDialog } from "@/components/ui/form-dialog";
import { IconAction } from "@/components/ui/icon-action";
import { ImageViewer } from "@/components/ui/image-gallery";
import { toast } from "@/components/ui/toast";
import { deleteCatalogFile } from "@/lib/catalog/file-actions";
import {
  type CatalogFile,
  canWriteFile,
  type FileWriteScope,
  isShownImage,
} from "@/lib/catalog/file-rules";
import { deleteArtistMoodboard } from "@/lib/catalog/moodboard-actions";
import { artistIdentity } from "@/lib/i18n/fr/artist-identity";

const fr = { artistIdentity };

// What an image of a moodboard is dropped as: a picture the browser shows,
// or a PDF.
const ACCEPT = "image/png,image/jpeg,image/webp,image/gif,application/pdf";

export type OpenFolder = {
  // null: the moodboard files in no folder (« Non classés »).
  id: string | null;
  title: string;
  note: string | null;
  sourceUrl: string | null;
  files: CatalogFile[];
  // Whether this viewer may rename or delete it.
  canEdit: boolean;
};

/**
 * One moodboard opened: its intention, its images as a wall (each shown
 * large on a click, ← → from one to the next), the drop zone to add more,
 * and its rename / delete. `organizationId`: whoever may add images;
 * `scope`: a creative director deletes his own images only.
 */
export function MoodboardFolder({
  artistId,
  folder,
  organizationId,
  scope,
  onBack,
}: {
  artistId: string;
  folder: OpenFolder;
  organizationId: string | null;
  scope: FileWriteScope | null;
  onBack: () => void;
}) {
  const t = fr.artistIdentity.moodboards;
  const router = useRouter();
  const owner = { kind: "artist", id: artistId } as const;
  const upload = useCatalogUpload();
  const [sending, setSending] = useState(0);
  const [viewing, setViewing] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState<
    { kind: "folder" } | { kind: "image"; file: CatalogFile } | null
  >(null);
  const [deletePending, startDelete] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const nameOf = (file: CatalogFile) => file.description ?? file.fileName;

  const images = folder.files.filter(
    (file) => file.openUrl && isShownImage(file.mime),
  );
  const viewerImages = images.map((file, index) => ({
    src: file.openUrl ?? "",
    alt: nameOf(file),
    title: t.viewer.title(index + 1, images.length),
  }));

  const send = (picked: File[]) => {
    const moodboardId = folder.id;
    if (!organizationId || !moodboardId || picked.length === 0) return;
    setSending(picked.length);
    upload.run(
      picked,
      (file) => ({
        organizationId,
        owner,
        category: "moodboard",
        moodboardId,
        file,
      }),
      (failed, lastError) => {
        setSending(0);
        const sent = picked.length - failed.length;
        if (sent > 0) toast.success(t.sent(sent));
        if (lastError) toast.error(lastError);
        router.refresh();
      },
    );
  };

  const confirmDelete = () => {
    if (!deleting) return;
    startDelete(async () => {
      if (deleting.kind === "image") {
        const result = await deleteCatalogFile({
          owner,
          fileId: deleting.file.id,
        });
        if (!result.ok) return setDeleteError(result.error);
        toast.success(t.confirm.imageDeleted);
        setDeleting(null);
        return router.refresh();
      }
      if (!folder.id) return;
      const result = await deleteArtistMoodboard({
        artistId,
        moodboardId: folder.id,
      });
      if (!result.ok) {
        setDeleteError(result.error);
        return router.refresh();
      }
      toast.success(t.confirm.deleted);
      setDeleting(null);
      onBack();
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <IconChevronLeft aria-hidden data-icon="inline-start" />
          {t.back}
        </Button>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {folder.sourceUrl && (
            <IconAction
              label={t.openInFigma}
              icon={IconArrowUpRight}
              onClick={() =>
                window.open(
                  folder.sourceUrl ?? "",
                  "_blank",
                  "noopener,noreferrer",
                )
              }
            />
          )}
          {folder.id && folder.canEdit && (
            <>
              <IconAction
                label={t.edit}
                icon={IconPenWriting2}
                onClick={() => setEditing(true)}
              />
              <IconAction
                label={t.remove}
                icon={IconTrash}
                onClick={() => setDeleting({ kind: "folder" })}
              />
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <h3 className="text-body-lg font-semibold">{folder.title}</h3>
        <p className="text-sm text-muted-foreground">
          {folder.id
            ? (folder.note ?? t.count(folder.files.length))
            : t.looseNote}
        </p>
        {folder.id && folder.note && (
          <p className="text-xs text-muted-foreground">
            {t.count(folder.files.length)}
          </p>
        )}
      </div>

      {organizationId && folder.id && (
        <FileDropZone
          label={upload.pending ? t.sending(upload.done, sending) : t.drop}
          hint={t.dropHint}
          accept={ACCEPT}
          multiple
          disabled={upload.pending}
          onFiles={send}
        />
      )}

      {folder.files.length === 0 ? (
        <EmptyNote>{t.folderEmpty}</EmptyNote>
      ) : (
        <ul className="columns-2 gap-3 sm:columns-3 lg:columns-4">
          {folder.files.map((file) => {
            const imageIndex = images.indexOf(file);
            return (
              <li
                key={file.id}
                className="group relative mb-3 break-inside-avoid overflow-hidden rounded-xl border border-[color:var(--border-hairline)] bg-muted/40"
              >
                {imageIndex >= 0 ? (
                  <button
                    type="button"
                    aria-label={t.openImage(nameOf(file))}
                    onClick={() => setViewing(imageIndex)}
                    className="block w-full cursor-zoom-in"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- a short-lived signed URL, not an optimisable asset */}
                    <img
                      src={file.previewUrl ?? file.openUrl ?? ""}
                      alt=""
                      loading="lazy"
                      className="block h-auto w-full"
                    />
                  </button>
                ) : (
                  <a
                    href={file.openUrl ?? undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex aspect-[4/3] flex-col items-center justify-center gap-2 px-3 text-center"
                  >
                    <IconFile
                      aria-hidden
                      className="size-8 text-muted-foreground"
                    />
                    <span className="line-clamp-2 text-xs font-medium">
                      {nameOf(file)}
                    </span>
                  </a>
                )}
                {organizationId && canWriteFile(file, scope) && (
                  <Button
                    variant="outline"
                    size="icon-sm"
                    aria-label={t.removeImage(nameOf(file))}
                    onClick={() => setDeleting({ kind: "image", file })}
                    className="absolute top-2 right-2 bg-card/90 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100"
                  >
                    <IconTrash aria-hidden />
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <ImageViewer
        images={viewerImages}
        index={viewing}
        onIndexChange={setViewing}
        labels={t.viewer}
      />

      {folder.id && (
        <FormDialog
          open={editing}
          onOpenChange={setEditing}
          title={t.form.editTitle}
          description={t.form.editBody}
          closeLabel={t.confirm.close}
        >
          <MoodboardForm
            artistId={artistId}
            initial={{ id: folder.id, title: folder.title, note: folder.note }}
            onDone={() => setEditing(false)}
          />
        </FormDialog>
      )}

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (open) return;
          setDeleteError(null);
          setDeleting(null);
        }}
        title={
          deleting?.kind === "image" ? t.confirm.imageTitle : t.confirm.title
        }
        description={
          deleting?.kind === "image"
            ? t.confirm.imageBody(nameOf(deleting.file))
            : t.confirm.body(folder.title, folder.files.length)
        }
        cancelLabel={t.confirm.cancel}
        closeLabel={t.confirm.close}
        confirmLabel={t.confirm.confirm}
        pendingLabel={t.confirm.deleting}
        pending={deletePending}
        destructive
        error={deleteError}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
