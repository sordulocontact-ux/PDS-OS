"use client";

import { useActionState, useEffect } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { SubmitButton } from "@/components/auth/submit-button";
import { ArtistRelationField } from "@/components/catalog/artist-relation-field";
import { TextareaField } from "@/components/auth/textarea-field";
import { OptionSelect } from "@/components/projects/option-select";
import { Button } from "@/components/ui/button";
import { idleFormState } from "@/lib/auth/form-state";
import type { ArtistDetail } from "@/lib/catalog/artist-types";
import { countryItems } from "@/lib/catalog/countries";
import { isArtistRelation } from "@/lib/catalog/types";
import { updateArtist } from "@/lib/catalog/profile-actions";
import { catalog } from "@/lib/i18n/fr/catalog";

const fr = { catalog };

// Identity, relation with PDS, biography and notes of the artist. Closes once
// saved.
export function ArtistProfileForm({
  artist,
  onDone,
}: {
  artist: ArtistDetail;
  onDone: (message?: string) => void;
}) {
  const t = fr.catalog.profileForm;
  const [state, action] = useActionState(updateArtist, idleFormState);
  const values = state.status === "error" ? (state.values ?? {}) : {};
  const errors = state.status === "error" ? (state.fieldErrors ?? {}) : {};
  const value = (field: string, fallback: string | null) =>
    values[field] ?? fallback ?? "";

  useEffect(() => {
    if (state.status === "success") onDone(state.message);
    // onDone changes identity on every render of the parent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={action} noValidate className="flex flex-col gap-5">
      <input type="hidden" name="artistId" value={artist.id} />
      <Field
        name="name"
        label={t.name}
        required
        autoComplete="off"
        maxLength={200}
        defaultValue={value("name", artist.name)}
        error={errors.name}
      />
      <ArtistRelationField
        defaultValue={
          isArtistRelation(values.relation) ? values.relation : artist.relation
        }
        hint={fr.catalog.relation.editHint}
        error={errors.relation}
      />
      <Field
        name="legalName"
        label={t.legalName}
        autoComplete="off"
        maxLength={200}
        defaultValue={value("legalName", artist.legalName)}
        error={errors.legalName}
      />
      <OptionSelect
        name="countryCode"
        label={t.country}
        placeholder={t.countryPlaceholder}
        items={countryItems()}
        defaultValue={value("countryCode", artist.countryCode) || null}
        error={errors.countryCode}
      />
      <TextareaField
        name="bio"
        label={t.bio}
        hint={t.bioHint}
        maxLength={5000}
        className="min-h-32"
        defaultValue={value("bio", artist.bio)}
        error={errors.bio}
      />
      <TextareaField
        name="notes"
        label={t.notes}
        maxLength={5000}
        defaultValue={value("notes", artist.notes)}
        error={errors.notes}
      />

      {state.status === "error" && state.formError && (
        <FormMessage kind="error">{state.formError}</FormMessage>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="ghost"
          size="lg"
          onClick={() => onDone()}
        >
          {t.cancel}
        </Button>
        <SubmitButton pendingLabel={t.submitting}>{t.submit}</SubmitButton>
      </div>
    </form>
  );
}
