"use client";

import { IconImage } from "nucleo-sharp-essential";
import { useEffect, useId, useRef } from "react";

import { FieldError } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { projectShell } from "@/lib/i18n/fr/project-shell";
import { setProjectCover } from "@/lib/projects/cover-actions";
import { COVER_ACCEPT } from "@/lib/projects/cover-rules";
import { uploadProjectCover } from "@/lib/projects/upload-cover";
import { cn } from "@/lib/utils";

const fr = { projectShell };

/**
 * Changes the project's cover at once (no « Enregistrer »), for whoever may
 * (can_edit_project_cover): `overlay`, the round button on the cover of the
 * overview's head — shown on hover or focus with a mouse, always on touch;
 * `buttons`, « Changer la pochette » and « Retirer » in « Informations ».
 * The server action revalidates the page.
 */
export function ProjectCoverEdit({
  organizationId,
  projectId,
  hasCover,
  variant = "overlay",
}: {
  organizationId: string;
  projectId: string;
  // An image was chosen for the project (not the Catalogue's, not the
  // default visual): it can be removed.
  hasCover: boolean;
  variant?: "overlay" | "buttons";
}) {
  const t = fr.projectShell.cover;
  const input = useRef<HTMLInputElement>(null);
  const errorId = useId();
  const { pending, error, run } = useWriteSubmit(undefined, t.saved);
  // On the image, the error can only be said in a toast.
  useEffect(() => {
    if (error && variant === "overlay")
      toast.error(error, { id: `cover-${projectId}` });
  }, [error, variant, projectId]);

  function upload(file: File | undefined) {
    if (!file) return;
    run(() => uploadProjectCover({ organizationId, projectId, file }));
    if (input.current) input.current.value = "";
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

  if (variant === "overlay") {
    return (
      <>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label={hasCover ? t.change : t.add}
          title={hasCover ? t.change : t.add}
          disabled={pending}
          aria-busy={pending || undefined}
          onClick={() => input.current?.click()}
          className={cn(
            "absolute right-1.5 bottom-1.5 z-10 rounded-full border-transparent bg-[var(--surface-glass)] backdrop-blur-md",
            "pointer-fine:opacity-0 pointer-fine:group-hover/cover:opacity-100 pointer-fine:focus-visible:opacity-100",
            pending && "opacity-100",
          )}
        >
          <IconImage aria-hidden />
        </Button>
        {picker}
      </>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2" aria-busy={pending || undefined}>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => input.current?.click()}
        >
          <IconImage aria-hidden data-icon="inline-start" />
          {pending ? t.saving : hasCover ? t.change : t.add}
        </Button>
        {hasCover && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() =>
              run(() => setProjectCover({ projectId, path: null }), t.removed)
            }
          >
            {t.remove}
          </Button>
        )}
      </div>
      {picker}
      <FieldError id={errorId}>{error ?? undefined}</FieldError>
    </div>
  );
}
