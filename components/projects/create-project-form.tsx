"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { Field } from "@/components/auth/field";
import { FieldError, FormMessage } from "@/components/auth/form-message";
import { SubmitButton } from "@/components/auth/submit-button";
import { OptionSelect } from "@/components/projects/option-select";
import { buttonVariants } from "@/components/ui/button";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { createProject } from "@/lib/projects/actions";
import {
  RELEASE_TYPES,
  idleCreateProjectState,
  type ArtistOption,
  type OwnerOption,
} from "@/lib/projects/types";
import { cn } from "@/lib/utils";

type ArtistMode = "existing" | "new";

export function CreateProjectForm({
  artists,
  owners,
  defaultOwnerId,
}: {
  artists: ArtistOption[];
  owners: OwnerOption[];
  defaultOwnerId: string | null;
}) {
  const t = fr.shell.newProject;
  const [state, action] = useActionState(createProject, idleCreateProjectState);
  const values = state.status === "error" ? (state.values ?? {}) : {};
  const errors = state.status === "error" ? (state.fieldErrors ?? {}) : {};
  const [mode, setMode] = useState<ArtistMode>(
    artists.length === 0 || values.artistMode === "new" ? "new" : "existing",
  );

  const releaseItems = Object.fromEntries(
    RELEASE_TYPES.map((type) => [type, fr.shell.releaseTypes[type]]),
  );
  const artistItems = Object.fromEntries(artists.map((a) => [a.id, a.name]));
  const ownerItems = Object.fromEntries(
    owners.map((o) => [
      o.personId,
      o.personId === defaultOwnerId ? `${o.name} ${t.you}` : o.name,
    ]),
  );

  return (
    <form action={action} noValidate className="flex flex-col gap-5">
      <Field
        name="title"
        label={t.fields.title}
        required
        autoFocus
        maxLength={200}
        defaultValue={values.title ?? ""}
        error={errors.title}
      />

      <OptionSelect
        name="releaseType"
        label={t.fields.releaseType}
        items={releaseItems}
        defaultValue={values.releaseType ?? "single"}
        error={errors.releaseType}
      />

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-sm font-medium">
          {t.fields.artist}
        </legend>
        <input type="hidden" name="artistMode" value={mode} />
        {artists.length > 0 ? (
          <div
            role="radiogroup"
            className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1"
          >
            {(["existing", "new"] as const).map((option) => (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={mode === option}
                onClick={() => setMode(option)}
                className={cn(
                  "h-9 rounded-md text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                  mode === option
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {option === "existing"
                  ? t.fields.artistExisting
                  : t.fields.artistNew}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">{t.noArtistYet}</p>
        )}
        {mode === "existing" ? (
          <OptionSelect
            name="artistId"
            label={t.fields.artistExisting}
            hideLabel
            placeholder={t.fields.artistPlaceholder}
            items={artistItems}
            defaultValue={values.artistId || null}
            error={errors.artistId}
          />
        ) : (
          <Field
            name="artistName"
            label={t.fields.artistNewName}
            maxLength={200}
            defaultValue={values.artistName ?? ""}
            error={errors.artistName}
          />
        )}
      </fieldset>

      <OptionSelect
        name="ownerPersonId"
        label={t.fields.owner}
        hint={t.fields.ownerHint}
        items={ownerItems}
        defaultValue={values.ownerPersonId || defaultOwnerId}
        error={errors.ownerPersonId}
      />

      {state.status === "error" && state.formError && (
        <FormMessage kind="error">{state.formError}</FormMessage>
      )}
      {errors.artistMode && (
        <FieldError id="artistMode-error">{errors.artistMode}</FieldError>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Link
          href={routes.projects}
          className={buttonVariants({ variant: "ghost", size: "lg" })}
        >
          {t.cancel}
        </Link>
        <SubmitButton pendingLabel={t.submitting}>{t.submit}</SubmitButton>
      </div>
    </form>
  );
}
