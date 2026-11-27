"use client";

import { useId, useState } from "react";

import { FieldError } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { projectTitles } from "@/lib/i18n/fr/project-titles";
import { renameProjectTitle } from "@/lib/projects/title-actions";
import { cn } from "@/lib/utils";

const fr = { projectTitles };

const t = fr.projectTitles.naming;

/**
 * A title's name typed where it is read (Sacha, 27/11/2026): one field and
 * its button, Entrée saves, Échap cancels (`onCancel`). `required`: a title
 * still to be named takes a name, never an empty one; else, left empty, it
 * takes its master's name back (rename_project_title), said by the
 * placeholder.
 */
export function TitleNameField({
  projectId,
  titleId,
  defaultValue = "",
  placeholder,
  required = false,
  submitLabel,
  done,
  onDone,
  onCancel,
  autoFocus = false,
  className,
}: {
  projectId: string;
  titleId: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  submitLabel: string;
  done: string;
  onDone?: () => void;
  onCancel?: () => void;
  autoFocus?: boolean;
  className?: string;
}) {
  const errorId = useId();
  const [missing, setMissing] = useState(false);
  const { pending, error, run } = useWriteSubmit(onDone, done);
  const shown = missing ? t.required : (error ?? undefined);
  return (
    <form
      noValidate
      className={cn("flex flex-col gap-1.5", className)}
      onSubmit={(event) => {
        event.preventDefault();
        const name = String(
          new FormData(event.currentTarget).get("name") ?? "",
        ).trim();
        if (required && !name) return setMissing(true);
        setMissing(false);
        run(() =>
          renameProjectTitle({ projectId, titleId, workingTitle: name }),
        );
      }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Input
          name="name"
          aria-label={t.field}
          placeholder={placeholder ?? t.field}
          defaultValue={defaultValue}
          maxLength={200}
          autoFocus={autoFocus}
          aria-invalid={shown ? true : undefined}
          aria-describedby={shown ? errorId : undefined}
          onKeyDown={(event) => {
            if (event.key === "Escape" && onCancel) {
              event.preventDefault();
              onCancel();
            }
          }}
          className="min-w-48 flex-1 sm:max-w-sm"
        />
        <Button type="submit" size="sm" disabled={pending} aria-busy={pending}>
          {submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" size="sm" variant="outline" onClick={onCancel}>
            {t.cancel}
          </Button>
        )}
      </div>
      <FieldError id={errorId}>{shown}</FieldError>
    </form>
  );
}
