"use client";

import { useState } from "react";

import { Field } from "@/components/auth/field";
import { FieldError, FormMessage } from "@/components/auth/form-message";
import { useLinkSubmit } from "@/components/production/provider/use-link-submit";
import { Button } from "@/components/ui/button";
import { FileDropZone } from "@/components/ui/file-drop-zone";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { fr } from "@/lib/i18n/fr";
import { depositLightVersion } from "@/lib/production/light/actions";
import { uploadProductionFile } from "@/lib/production/files/upload";
import { MAX_PRODUCTION_FILE_BYTES } from "@/lib/production/files/rules";
import { openProviderSlot } from "@/lib/production/provider/public-actions";
import { depositLightVersionByLink } from "@/lib/production/provider/light-link-actions";
import { createClient } from "@/lib/supabase/client";

import { readImageSize } from "./read-image-size";

const t = fr.productionLight.deposit;
const HTTPS = /^https:\/\/\S+$/;

export type LightPlace =
  | {
      kind: "app";
      projectId: string;
      sheetId: string;
      organizationId: string;
    }
  | { kind: "link"; token: string };

/**
 * « Déposer la version Vn » (proto lightBody): the cover's image — dropped
 * or chosen, its size read by the code — or the link of a teaser's
 * version. In the step for PDS, on the private link of whoever produces it.
 */
export function LightDepositForm({
  place,
  number,
  image,
}: {
  place: LightPlace;
  number: number;
  // A cover: an image; teasers: a link.
  image: boolean;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [missing, setMissing] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const app = useWriteSubmit(() => setFile(null), t.done(number));
  const link = useLinkSubmit();
  const pending = uploading || app.pending || link.pending;
  const error = localError ?? app.error ?? link.error;

  async function submit(form: HTMLFormElement) {
    setLocalError(null);
    const url = String(new FormData(form).get("url") ?? "").trim();
    if (image && !file) return setMissing(t.missingImage);
    if (!image && !HTTPS.test(url)) return setMissing(t.missingLink);
    setMissing(null);
    if (!image) {
      if (place.kind === "app")
        app.run(() =>
          depositLightVersion({
            projectId: place.projectId,
            sheetId: place.sheetId,
            number,
            fileId: null,
            url,
            width: null,
            height: null,
          }),
        );
      else
        link.run(
          () =>
            depositLightVersionByLink({
              token: place.token,
              url,
              path: null,
              fileName: null,
              width: null,
              height: null,
            }),
          `${t.done(number)}.`,
          () => form.reset(),
        );
      return;
    }
    if (!file) return;
    if (file.size > MAX_PRODUCTION_FILE_BYTES)
      return setLocalError(fr.productionPrep.errors.fileTooLarge);
    const size = await readImageSize(file);
    if (!size) return setMissing(t.unreadable);
    setUploading(true);
    try {
      if (place.kind === "app") {
        const recorded = await uploadProductionFile({
          organizationId: place.organizationId,
          projectId: place.projectId,
          sheetId: place.sheetId,
          kind: "version",
          note: "",
          file,
        });
        if (!recorded.ok) return setLocalError(recorded.error);
        app.run(() =>
          depositLightVersion({
            projectId: place.projectId,
            sheetId: place.sheetId,
            number,
            fileId: recorded.fileId,
            url: "",
            width: size.width,
            height: size.height,
          }),
        );
      } else {
        const slot = await openProviderSlot({
          token: place.token,
          fileName: file.name,
        });
        if (!slot.ok) return setLocalError(slot.error);
        const { error: upload } = await createClient()
          .storage.from("production-files")
          .upload(slot.path, file, {
            contentType: file.type || "application/octet-stream",
            upsert: false,
          });
        if (upload) return setLocalError(fr.productionLight.errors.failed);
        link.run(
          () =>
            depositLightVersionByLink({
              token: place.token,
              url: null,
              path: slot.path,
              fileName: file.name,
              width: size.width,
              height: size.height,
            }),
          `${t.done(number)}.`,
          () => setFile(null),
        );
      }
    } finally {
      setUploading(false);
    }
  }

  return (
    <form
      noValidate
      className="flex flex-col gap-3 rounded-xl bg-[var(--surface-soft)] p-4"
      onSubmit={(event) => {
        event.preventDefault();
        void submit(event.currentTarget);
      }}
    >
      <h3 className="font-semibold">{t.title(number)}</h3>
      {image ? (
        <div className="flex flex-col gap-1.5">
          <FileDropZone
            label={file ? `${t.chosen} : ${file.name}` : t.drop}
            hint={t.dropHint}
            accept="image/*"
            describedBy={missing ? "light-file-error" : undefined}
            onFiles={(files) => {
              const f = files[0] ?? null;
              if (f && !f.type.startsWith("image/"))
                return setMissing(t.notImage);
              setFile(f);
              setMissing(null);
            }}
          />
          {missing && <FieldError id="light-file-error">{missing}</FieldError>}
        </div>
      ) : (
        <Field
          name="url"
          type="url"
          inputMode="url"
          label={t.link(number)}
          hint={t.linkHint}
          aria-required
          maxLength={2000}
          error={missing ?? undefined}
        />
      )}
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <div>
        <Button
          type="submit"
          disabled={pending}
          aria-busy={pending || undefined}
        >
          {t.submit(number)}
        </Button>
      </div>
    </form>
  );
}
