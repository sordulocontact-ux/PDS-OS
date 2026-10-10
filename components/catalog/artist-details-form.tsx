"use client";

import { IconImage } from "nucleo-sharp-essential";
import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { SubmitButton } from "@/components/auth/submit-button";
import { TextareaField } from "@/components/auth/textarea-field";
import { Avatar } from "@/components/ui/avatar";
import { ArtistRelationField } from "@/components/catalog/artist-relation-field";
import { ContactPersonFields } from "@/components/catalog/artist-page/contact-person-fields";
import { Button } from "@/components/ui/button";
import { ChipChoice } from "@/components/ui/chip-choice";
import { useObjectUrl } from "@/components/ui/use-object-url";
import { routes } from "@/lib/auth/redirects";
import { createArtist } from "@/lib/catalog/actions";
import { CONTACT_ROLES, type ContactRole } from "@/lib/catalog/contacts";
import {
  MAX_PICTURE_BYTES,
  PICTURE_EXTENSIONS,
} from "@/lib/catalog/picture-rules";
import { uploadArtistPicture } from "@/lib/catalog/upload-picture";
import {
  formatFans,
  idleCreateArtistState,
  type CreateArtistState,
  isArtistRelation,
  type ArtistOption,
  type ArtistRelation,
  type DeezerArtistResult,
} from "@/lib/catalog/types";
import { fr } from "@/lib/i18n/fr";

// Second step of "Nouvel artiste": the chosen Deezer profile (or none), the
// name as it will appear in the catalog, the relation with PDS, and notes. Only the Deezer id is
// sent: the server reads the picture and link from Deezer itself. Without
// Deezer, a picture can be chosen here; and the main contact (a person of
// the Réseau) is given on the same screen (UX test of 09/10/2026: « Photo et
// contact absents de la création d'artiste (3 écrans) »). The picture goes
// from the browser once the artist exists, as on its page.
export function ArtistDetailsForm({
  deezer,
  initialName,
  initialNotes = "",
  initialRelation = null,
  onBack,
  onCancel,
  onDone,
  pickerMode,
  withContact = true,
}: {
  deezer: DeezerArtistResult | null;
  initialName: string;
  initialNotes?: string;
  initialRelation?: ArtistRelation | null;
  onBack: () => void;
  onCancel: () => void;
  onDone: (artist: ArtistOption) => void;
  pickerMode: boolean;
  // false: the contacts are reviewed after (PO's draft proposes them).
  withContact?: boolean;
}) {
  const t = fr.catalog.artistForm;
  const [picture, setPicture] = useState<File | null>(null);
  const [pictureError, setPictureError] = useState<string | null>(null);
  const preview = useObjectUrl(picture);
  const pictureInput = useRef<HTMLInputElement>(null);
  // The picture leaves the browser once the artist exists, in the same
  // submission: the button stays busy until it is sent.
  const [state, action] = useActionState(
    async (
      previous: CreateArtistState,
      formData: FormData,
    ): Promise<CreateArtistState & { pictureFailed?: boolean }> => {
      const result = await createArtist(previous, formData);
      if (result.status !== "created" || !picture || !result.organizationId)
        return result;
      const sent = await uploadArtistPicture({
        organizationId: result.organizationId,
        artistId: result.artist.id,
        file: picture,
      });
      return { ...result, pictureFailed: !sent.ok };
    },
    idleCreateArtistState,
  );
  const values = state.status === "error" ? (state.values ?? {}) : {};
  const errors = state.status === "error" ? (state.fieldErrors ?? {}) : {};
  const existing = state.status === "error" ? state.existing : undefined;
  const relation = isArtistRelation(values.relation)
    ? values.relation
    : initialRelation;
  const [contactRole, setContactRole] = useState<ContactRole>(
    (values.contactRole as ContactRole | undefined) ?? "manager",
  );
  // Created, but its picture or contact did not follow: said before going on.
  const problems =
    state.status === "created"
      ? [
          ...("pictureFailed" in state && state.pictureFailed
            ? [t.picture.failed]
            : []),
          ...(state.contactFailed ? [t.contact.failed] : []),
        ]
      : [];

  useEffect(() => {
    if (state.status === "created" && problems.length === 0)
      onDone(state.artist);
    // onDone changes identity on every render of the parent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const choosePicture = (file: File | undefined) => {
    if (!file) return;
    const p = fr.catalog.profileForm.picture;
    if (!PICTURE_EXTENSIONS[file.type]) setPictureError(p.badType);
    else if (file.size > MAX_PICTURE_BYTES) setPictureError(p.tooLarge);
    else {
      setPictureError(null);
      setPicture(file);
    }
  };

  if (state.status === "created" && problems.length > 0) {
    const artist = state.artist;
    return (
      <div className="flex flex-col gap-5">
        {problems.map((problem) => (
          <FormMessage key={problem} kind="error">
            {problem}
          </FormMessage>
        ))}
        <div className="flex justify-end">
          <Button size="lg" onClick={() => onDone(artist)}>
            {t.picture.openArtist}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form action={action} noValidate className="flex flex-col gap-5">
      {deezer ? (
        <div className="flex items-center gap-3 rounded-xl border border-border p-3">
          <input type="hidden" name="deezerId" value={deezer.deezerId} />
          <Avatar
            name={deezer.name}
            pictureUrl={deezer.pictureUrl}
            className="size-12"
          />
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="text-xs text-muted-foreground">
              {t.deezer.source}
            </span>
            <span className="truncate text-sm font-medium">{deezer.name}</span>
            <span className="text-xs text-muted-foreground">
              {t.deezer.fans(formatFans(deezer.fans))}
            </span>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={onBack}>
            {t.deezer.change}
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="link"
          className="h-auto w-fit p-0 text-xs"
          onClick={onBack}
        >
          {t.deezer.backToSearch}
        </Button>
      )}

      {!deezer && (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1.5 text-sm font-medium">
            {t.picture.title}
          </legend>
          <div className="flex items-center gap-4">
            <Avatar
              name={values.name ?? initialName}
              pictureUrl={preview}
              className="size-16"
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => pictureInput.current?.click()}
              >
                <IconImage aria-hidden data-icon="inline-start" />
                {picture ? t.picture.replace : t.picture.add}
              </Button>
              {picture && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setPicture(null)}
                >
                  {t.picture.remove}
                </Button>
              )}
            </div>
          </div>
          <input
            ref={pictureInput}
            type="file"
            accept={Object.keys(PICTURE_EXTENSIONS).join(",")}
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={(event) => {
              choosePicture(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
          {pictureError ? (
            <FormMessage kind="error">{pictureError}</FormMessage>
          ) : (
            <p className="text-xs text-muted-foreground">{t.picture.hint}</p>
          )}
        </fieldset>
      )}

      <div className="flex flex-col gap-1.5">
        <Field
          name="name"
          label={t.name}
          hint={t.nameHint}
          required
          autoFocus
          autoComplete="off"
          maxLength={200}
          defaultValue={values.name ?? initialName}
          error={errors.name}
        />
        {existing &&
          (pickerMode ? (
            <Button
              type="button"
              variant="link"
              className="h-auto w-fit p-0 text-xs"
              onClick={() => onDone(existing)}
            >
              {t.selectExisting} : {existing.name}
            </Button>
          ) : (
            <Link
              href={routes.artist(existing.id)}
              className="w-fit text-xs font-medium underline"
            >
              {t.openExisting} : {existing.name}
            </Link>
          ))}
      </div>

      <ArtistRelationField defaultValue={relation} error={errors.relation} />

      {withContact && (
        <fieldset className="flex flex-col gap-4 border-t border-border pt-5">
          <legend className="sr-only">{t.contact.title}</legend>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium" aria-hidden>
              {t.contact.title}
            </span>
            <span className="text-xs text-muted-foreground">
              {t.contact.hint}
            </span>
          </div>
          <ChipChoice
            name="contactRole"
            legend={t.contact.role}
            options={CONTACT_ROLES.map((value) => ({
              value,
              label: fr.catalog.contacts.roles[value],
            }))}
            value={contactRole}
            onChange={(value) => value && setContactRole(value)}
          />
          <ContactPersonFields
            prefix="contact"
            role={contactRole}
            defaultNetworkId={values.contactNetworkContactId || null}
            defaultName={values.contactName || null}
            defaultEmail={values.contactEmail ?? null}
            defaultPhone={values.contactPhone ?? null}
            errors={{
              name: errors.contactName,
              email: errors.contactEmail,
              phone: errors.contactPhone,
            }}
          />
        </fieldset>
      )}

      <TextareaField
        name="notes"
        label={t.notes}
        maxLength={5000}
        defaultValue={values.notes ?? initialNotes}
        error={errors.notes}
      />

      {state.status === "error" && state.formError && (
        <FormMessage kind="error">{state.formError}</FormMessage>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" size="lg" onClick={onCancel}>
          {t.cancel}
        </Button>
        <SubmitButton
          pendingLabel={picture ? t.picture.uploading : t.submitting}
        >
          {t.submit}
        </SubmitButton>
      </div>
    </form>
  );
}
