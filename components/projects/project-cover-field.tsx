"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

import { FieldError } from "@/components/auth/form-message";
import { ProjectCover } from "@/components/projects/project-cover";
import { Button } from "@/components/ui/button";
import { FileDropZone } from "@/components/ui/file-drop-zone";
import { projectShell } from "@/lib/i18n/fr/project-shell";
import { shell } from "@/lib/i18n/fr/shell";
import { COVER_ACCEPT, coverFileProblem } from "@/lib/projects/cover-rules";

const fr = { projectShell, shell };

/**
 * « Pochette » of the new project form (retour d'Akili du 05/11/2026):
 * optional, so no « * ». The drop zone, then the image chosen with its
 * preview, « Changer » and « Retirer l'image ». A file that is not an image
 * (or too heavy) is said under the field at once. Uploaded once the project
 * exists (CreateProjectForm), not before.
 */
export function ProjectCoverField({
  file,
  onFile,
}: {
  file: File | null;
  onFile: (file: File | null) => void;
}) {
  const t = fr.shell.newProject.fields;
  const problems = fr.projectShell.cover.problem;
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  // The preview lives as long as the file chosen.
  const preview = useMemo(
    () => (file ? URL.createObjectURL(file) : null),
    [file],
  );
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  function pick(chosen: File) {
    const problem = coverFileProblem(chosen);
    setError(problem ? problems[problem] : null);
    if (!problem) onFile(chosen);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span id={`${id}-label`} className="text-sm font-medium">
        {t.cover}
      </span>
      {file ? (
        <div className="flex flex-wrap items-center gap-4">
          <ProjectCover id={id} title={file.name} url={preview} size="md" />
          <span className="min-w-0 flex-1 text-sm break-all text-[color:var(--text-secondary)]">
            {t.coverChosen(file.name)}
          </span>
          <span className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => input.current?.click()}
            >
              {fr.projectShell.cover.change}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onFile(null)}
            >
              {t.coverRemove}
            </Button>
          </span>
        </div>
      ) : (
        <FileDropZone
          label={t.coverDrop}
          hint={t.coverHint}
          accept={COVER_ACCEPT}
          describedBy={error ? `${id}-error` : undefined}
          onFiles={(files) => files[0] && pick(files[0])}
        />
      )}
      <input
        ref={input}
        type="file"
        accept={COVER_ACCEPT}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(event) => {
          const chosen = event.target.files?.[0];
          event.target.value = "";
          if (chosen) pick(chosen);
        }}
      />
      <FieldError id={`${id}-error`}>{error ?? undefined}</FieldError>
    </div>
  );
}
