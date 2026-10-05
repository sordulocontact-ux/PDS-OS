"use client";

import { IconFile, IconPaperclip, IconPlus } from "nucleo-sharp-essential";
import { useRouter } from "next/navigation";
import { createContext, use, useEffect, useRef, useState } from "react";

import {
  AddFilesDialog,
  type AddFilesMode,
} from "@/components/catalog/files/add-files-dialog";
import { EmptyState } from "@/components/shell/empty-state";
import { Button } from "@/components/ui/button";
import { useFileDrop } from "@/components/ui/use-file-drop";
import {
  AUDIO_ACCEPT,
  suggestedCategory,
  type FileOwner,
  type FileView,
} from "@/lib/catalog/file-rules";
import type { AudioState } from "@/lib/catalog/title-rules";
import { fr } from "@/lib/i18n/fr";
import { viewHref } from "@/lib/ui/view-href";

// Shared inside FileImport: the "Ajouter un fichier" button and the empty
// frame open the picker; the drop area hands over dropped files (not while
// the modal is open).
type ImportValue = {
  pick: () => void;
  receive: (files: File[]) => void;
  busy: boolean;
};
const ImportContext = createContext<ImportValue | null>(null);

/**
 * The file library as an import zone (feedback n°6): files dropped on its
 * list (FileDropArea), or picked from the button or the empty frame, open
 * the modal that asks their category and precision. The view they were dropped on is the
 * category offered first. A file dropped next to the zone is ignored rather
 * than opened by the browser (which would leave the page).
 * The audio versions of a title (`audio`) go the same way: the modal asks
 * their audio state instead.
 */
export function FileImport({
  organizationId,
  owner,
  onAdded,
  children,
  ...target
}: {
  organizationId: string;
  owner: FileOwner;
  // Once recorded, for a page other than the owner's (its own refreshes
  // from the server action).
  onAdded?: () => void;
  children: React.ReactNode;
} & (
  | {
      view: FileView;
      // The library's page: views are `?category=` on it.
      basePath: string;
      audio?: never;
    }
  | { audio: { defaultState: AudioState }; view?: never; basePath?: never }
)) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[] | null>(null);

  useEffect(() => {
    const ignore = (event: DragEvent) => {
      if (
        event.defaultPrevented ||
        !event.dataTransfer?.types.includes("Files")
      )
        return;
      event.preventDefault();
      if (event.type === "dragover") event.dataTransfer.dropEffect = "none";
    };
    window.addEventListener("dragover", ignore);
    window.addEventListener("drop", ignore);
    return () => {
      window.removeEventListener("dragover", ignore);
      window.removeEventListener("drop", ignore);
    };
  }, []);

  function added(category: string) {
    setFiles(null);
    onAdded?.();
    // Added from another category's view: show it where it now lives.
    if (target.view && target.view !== "all" && target.view !== category)
      router.push(viewHref(target.basePath, { category }));
  }
  const mode: AddFilesMode = target.audio
    ? { kind: "audio", defaultState: target.audio.defaultState }
    : {
        kind: "library",
        suggested: files && suggestedCategory(owner.kind, target.view, files),
      };

  return (
    <ImportContext
      value={{
        pick: () => input.current?.click(),
        receive: setFiles,
        busy: files !== null,
      }}
    >
      {children}
      <input
        ref={input}
        type="file"
        multiple
        accept={target.audio ? AUDIO_ACCEPT : undefined}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(event) => {
          const picked = [...(event.target.files ?? [])];
          // Picking the same file again must fire a change.
          event.target.value = "";
          if (picked.length > 0) setFiles(picked);
        }}
      />
      <AddFilesDialog
        organizationId={organizationId}
        owner={owner}
        files={files}
        mode={mode}
        onClose={() => setFiles(null)}
        onAdded={added}
      />
    </ImportContext>
  );
}

/**
 * Where files are dropped: the list or the empty frame, under the tabs.
 * While files hover it, an opaque layer takes its place and says so.
 */
export function FileDropArea({ children }: { children: React.ReactNode }) {
  const context = use(ImportContext);
  const { dragging, handlers } = useFileDrop({
    multiple: true,
    disabled: !context || context.busy,
    onFiles: (files) => context?.receive(files),
  });
  return (
    <div
      {...handlers}
      data-dragging={dragging || undefined}
      className="group/drop relative"
    >
      {children}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 flex min-h-32 items-center justify-center gap-2 rounded-xl border-2 border-dashed border-ring bg-background text-sm font-medium opacity-0 transition-opacity duration-[var(--duration-fast)] ease-[var(--ease-out)] group-data-dragging/drop:opacity-100"
      >
        <IconFile aria-hidden className="size-5" />
        {fr.catalogFiles.upload.dropHere}
      </div>
    </div>
  );
}

/**
 * "Ajouter un fichier", at the end of the library's tabs. `compact`: the
 * add button of a block (outline, small, +), like "Ajouter une session".
 * `row`: the action of a table row (outline, xs, above the row's stretched
 * link), like the Master's "Ajouter les pistes".
 */
export function FileImportButton({
  label = fr.catalogFiles.upload.add,
  compact = false,
  row = false,
}: {
  label?: string;
  compact?: boolean;
  row?: boolean;
}) {
  const context = use(ImportContext);
  const Icon = compact ? IconPlus : IconPaperclip;
  return (
    <Button
      type="button"
      variant={compact || row ? "outline" : "default"}
      size={row ? "xs" : compact ? "sm" : "lg"}
      className={row ? "relative z-10" : undefined}
      onClick={() => context?.pick()}
    >
      {!row && <Icon aria-hidden data-icon="inline-start" />}
      {label}
    </Button>
  );
}

/** The empty library's frame: click anywhere in it to pick a file. */
export function FileImportEmpty({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  const context = use(ImportContext);
  return (
    <EmptyState
      icon={IconFile}
      title={title}
      body={body}
      onClick={() => context?.pick()}
    />
  );
}
