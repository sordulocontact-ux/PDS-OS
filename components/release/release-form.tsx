"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import { useCanEditProject } from "@/components/projects/edit-access";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fr } from "@/lib/i18n/fr";
import type { ReleaseField } from "@/lib/release/schema";
import type { SaveReleaseState } from "@/lib/release/action-types";

type Props = {
  action: (
    previous: SaveReleaseState,
    formData: FormData,
  ) => Promise<SaveReleaseState>;
  initial: Record<ReleaseField, string>;
  isNew: boolean;
};

const t = fr.release.form;

type FieldSpec = {
  name: ReleaseField;
  type?: string;
  hint?: string;
  required?: boolean;
  mono?: boolean;
  inputMode?: "numeric" | "url";
  placeholder?: string;
};

const FIELDS: FieldSpec[] = [
  { name: "title", required: true },
  {
    name: "isrc",
    hint: t.fields.isrcHint,
    mono: true,
    placeholder: "FRZ032600001",
  },
  { name: "upc", hint: t.fields.upcHint, mono: true, inputMode: "numeric" },
  { name: "plannedReleaseDate", type: "date" },
  {
    name: "spotifyUrl",
    type: "url",
    hint: t.fields.spotifyUrlHint,
    inputMode: "url",
    placeholder: "https://open.spotify.com/track/…",
  },
];

/** Create or edit the release. Values are normalized and checked on the server. */
export function ReleaseForm({ action, initial, isNew }: Props) {
  const [state, formAction, pending] = useActionState(action, {
    status: "idle",
  });
  const canEdit = useCanEditProject();

  useEffect(() => {
    if (state.status === "saved") toast.success(t.saved);
  }, [state]);

  const values = state.status === "error" ? state.values : initial;
  const fieldErrors = state.status === "error" ? state.fieldErrors : {};
  const formError = state.status === "error" ? state.formError : null;

  // Read-only viewers get the values, not a form that looks editable.
  if (!canEdit) {
    return (
      <dl className="grid gap-5 sm:grid-cols-2">
        {FIELDS.map((field) => (
          <div
            key={field.name}
            className={
              field.name === "title" || field.name === "spotifyUrl"
                ? "grid gap-1 sm:col-span-2"
                : "grid gap-1"
            }
          >
            <dt className="text-xs text-muted-foreground">
              {t.fields[field.name]}
            </dt>
            <dd
              className={
                initial[field.name]
                  ? `text-sm font-medium break-all ${field.mono ? "font-mono" : ""}`
                  : "text-sm text-muted-foreground"
              }
            >
              {initial[field.name] || fr.catalog.notProvided}
            </dd>
          </div>
        ))}
      </dl>
    );
  }

  return (
    <form action={formAction} className="grid gap-5" noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
        {FIELDS.map((field) => {
          const id = `release-${field.name}`;
          const invalid = fieldErrors[field.name] === true;
          const describedBy = [
            field.hint ? `${id}-hint` : null,
            invalid ? `${id}-error` : null,
          ]
            .filter(Boolean)
            .join(" ");
          return (
            <div
              key={field.name}
              className={
                field.name === "title" || field.name === "spotifyUrl"
                  ? "grid gap-2 sm:col-span-2"
                  : "grid gap-2"
              }
            >
              <Label htmlFor={id}>{t.fields[field.name]}</Label>
              <Input
                // Remount on server-side changes so defaultValue follows.
                key={`${field.name}:${values[field.name]}`}
                id={id}
                name={field.name}
                type={field.type ?? "text"}
                defaultValue={values[field.name]}
                required={field.required}
                inputMode={field.inputMode}
                placeholder={field.placeholder}
                autoComplete="off"
                spellCheck={false}
                aria-invalid={invalid || undefined}
                aria-describedby={describedBy || undefined}
                className={
                  field.mono ? "h-10 font-mono uppercase md:h-9" : "h-10 md:h-9"
                }
              />
              {invalid ? (
                <p id={`${id}-error`} className="text-sm text-destructive">
                  {t.errors[field.name]}
                </p>
              ) : field.hint ? (
                <p id={`${id}-hint`} className="text-xs text-muted-foreground">
                  {field.hint}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>

      {formError && (
        <p role="alert" className="text-sm text-destructive">
          {t.errors[formError]}
        </p>
      )}

      <div>
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? t.pending : isNew ? t.submitCreate : t.submitEdit}
        </Button>
      </div>
    </form>
  );
}
