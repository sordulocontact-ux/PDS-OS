"use client";

import { IconImage } from "nucleo-sharp-essential";
import { useRef, useState, useTransition } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { ArtistAvatar } from "@/components/catalog/artist-avatar";
import { Button } from "@/components/ui/button";
import type { ArtistDetail } from "@/lib/catalog/artist-types";
import { PICTURE_EXTENSIONS } from "@/lib/catalog/picture-rules";
import { setArtistPicture } from "@/lib/catalog/profile-actions";
import { uploadArtistPicture } from "@/lib/catalog/upload-picture";
import { fr } from "@/lib/i18n/fr";

// Picture of the artist, applied at once (not on "Enregistrer"): upload,
// replace, or remove the upload to come back to Deezer's picture.
export function ArtistPictureField({ artist }: { artist: ArtistDetail }) {
  const t = fr.catalog.profileForm.picture;
  const input = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function upload(file: File | undefined) {
    if (!file) return;
    setError(null);
    startTransition(async () => {
      const result = await uploadArtistPicture({
        organizationId: artist.organizationId,
        artistId: artist.id,
        file,
      });
      if (!result.ok) setError(result.error);
      if (input.current) input.current.value = "";
    });
  }

  function remove() {
    setError(null);
    startTransition(async () => {
      const result = await setArtistPicture({
        artistId: artist.id,
        path: null,
      });
      if (!result.ok) setError(result.error);
    });
  }

  const source =
    artist.pictureSource === "upload"
      ? t.uploaded
      : artist.pictureSource === "deezer"
        ? t.fromDeezer
        : t.none;

  return (
    <fieldset className="flex flex-col gap-3" aria-busy={pending || undefined}>
      <legend className="mb-3 text-sm font-medium">{t.title}</legend>
      <div className="flex items-center gap-4">
        <ArtistAvatar
          name={artist.name}
          pictureUrl={artist.pictureUrl}
          className="size-20 rounded-2xl text-[length:var(--type-body-lg)]"
        />
        <div className="flex min-w-0 flex-col gap-2">
          <span className="text-caption text-muted-foreground">{source}</span>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => input.current?.click()}
            >
              <IconImage aria-hidden data-icon="inline-start" />
              {pending
                ? t.uploading
                : artist.pictureSource === "upload"
                  ? t.replace
                  : t.upload}
            </Button>
            {artist.pictureSource === "upload" && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={remove}
              >
                {artist.deezerPictureUrl ? t.backToDeezer : t.remove}
              </Button>
            )}
          </div>
        </div>
      </div>
      <input
        ref={input}
        type="file"
        accept={Object.keys(PICTURE_EXTENSIONS).join(",")}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(event) => upload(event.target.files?.[0])}
      />
      <p className="text-xs text-muted-foreground">{t.hint}</p>
      {error && <FormMessage kind="error">{error}</FormMessage>}
    </fieldset>
  );
}
