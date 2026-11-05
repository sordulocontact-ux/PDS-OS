"use client";

import {
  IconEyeOpen,
  IconFolderOpen,
  IconImage,
  IconLoader,
} from "nucleo-sharp-essential";
import { useRouter } from "next/navigation";
import { useRef, useTransition } from "react";

import { ReleaseCover } from "@/components/catalog/artist-profile/release-cover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/toast";
import { useFileDrop } from "@/components/ui/use-file-drop";
import { routes } from "@/lib/auth/redirects";
import {
  COVER_ACCEPT,
  isCoverImage,
  type MasterCover,
} from "@/lib/catalog/cover-rules";
import { uploadCatalogFile } from "@/lib/catalog/upload-file";
import { catalog } from "@/lib/i18n/fr/catalog";
import { cn } from "@/lib/utils";

const fr = { catalog };

const SQUARE = "relative size-20 shrink-0 rounded-2xl";
const FOCUS =
  "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--focus-ring)]";

/**
 * The title's cover in the head of its page (retour « Ajouter une cover
 * avec versions mises à jour »): the latest « Pochette » image of its Files.
 * A writer adds one, or a new version, by choosing or dropping an image;
 * the earlier versions stay in the Files tab. Nothing for a reader when
 * the title has none.
 */
export function TitleCover({
  masterId,
  organizationId,
  title,
  cover,
  canEdit,
}: {
  masterId: string;
  // Where the image is sent; a writer always has one.
  organizationId: string | null;
  title: string;
  cover: MasterCover | null;
  canEdit: boolean;
}) {
  const t = fr.catalog.master.cover;
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();

  const writable = canEdit && organizationId !== null;

  function upload(file: File | undefined) {
    if (!file || pending || !organizationId) return;
    // A dropped PDF or PSD is a file of the Files tab, never the cover.
    if (!isCoverImage({ category: "artwork", mime: file.type }))
      return void toast.error(t.notImage);
    startTransition(async () => {
      const result = await uploadCatalogFile({
        organizationId,
        owner: { kind: "master", id: masterId },
        category: "artwork",
        file,
        replacesId: cover?.fileId,
      });
      if (input.current) input.current.value = "";
      if (!result.ok) return void toast.error(result.error);
      toast.success(cover ? t.versionAdded(cover.version + 1) : t.added);
    });
  }

  // Dropping an image on the cover only: its `ref` would also take an
  // image pasted anywhere on the page (paste-targets.ts), the Files tab's.
  const {
    dragging,
    handlers: { onDragOver, onDragLeave, onDrop },
  } = useFileDrop({
    disabled: !writable || pending,
    multiple: false,
    onFiles: (files) => upload(files[0]),
  });
  const handlers = { onDragOver, onDragLeave, onDrop };

  if (!writable) {
    if (!cover) return null;
    return (
      <a
        href={cover.fullUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={t.open}
        className={cn(SQUARE, FOCUS)}
      >
        <ReleaseCover
          coverUrl={cover.thumbUrl}
          className="size-20 rounded-2xl"
        />
      </a>
    );
  }

  const picker = (
    <input
      ref={input}
      type="file"
      accept={COVER_ACCEPT}
      className="sr-only"
      tabIndex={-1}
      aria-hidden
      onChange={(event) => upload(event.target.files?.[0])}
    />
  );
  // The cover or the empty square dims while the image is sent.
  const busy = pending && (
    <span
      role="status"
      className="pointer-events-none absolute inset-0 flex items-center justify-center"
    >
      <IconLoader
        aria-hidden
        className="size-5 animate-spin motion-reduce:animate-none"
      />
      <span className="sr-only">{t.sending}</span>
    </span>
  );

  if (!cover)
    return (
      <div {...handlers} className={SQUARE}>
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={pending}
          aria-label={t.add}
          aria-busy={pending || undefined}
          className={cn(
            "flex size-full flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-border text-muted-foreground transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:border-[color:var(--border-hover)] hover:bg-muted hover:text-foreground",
            dragging && "border-solid border-ring bg-muted text-foreground",
            pending && "opacity-40",
            FOCUS,
          )}
        >
          <IconImage aria-hidden className="size-5" />
          <span aria-hidden className="text-sm font-medium">
            {t.short}
          </span>
        </button>
        {busy}
        {picker}
      </div>
    );

  return (
    <div {...handlers} className={SQUARE}>
      <DropdownMenu>
        <DropdownMenuTrigger
          disabled={pending}
          aria-label={t.menu(title)}
          aria-busy={pending || undefined}
          className={cn(
            "block size-full rounded-2xl transition-[scale] duration-[var(--duration-fast)] ease-[var(--ease-out)] motion-safe:active:scale-[.97]",
            dragging &&
              "outline-2 outline-offset-2 outline-[color:var(--focus-ring)]",
            pending && "opacity-40",
            FOCUS,
          )}
        >
          <ReleaseCover
            coverUrl={cover.thumbUrl}
            className="size-20 rounded-2xl"
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem
            onClick={() =>
              window.open(cover.fullUrl, "_blank", "noopener,noreferrer")
            }
          >
            <IconEyeOpen aria-hidden />
            {t.open}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => input.current?.click()}>
            <IconImage aria-hidden />
            {t.newVersion}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() =>
              router.push(`${routes.masterFiles(masterId)}?category=artwork`)
            }
          >
            <IconFolderOpen aria-hidden />
            {t.versions(cover.version)}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {busy}
      {picker}
    </div>
  );
}
