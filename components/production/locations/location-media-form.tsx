"use client";

import { useState } from "react";

import { Field } from "@/components/auth/field";
import { FieldError, FormMessage } from "@/components/auth/form-message";
import { ChoiceCards } from "@/components/ui/choice-cards";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { FilePickField } from "@/components/ui/file-pick-field";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { productionLocations } from "@/lib/i18n/fr/production-locations";
import { uploadProductionFile } from "@/lib/production/files/upload";
import { addLocationMedia } from "@/lib/production/locations/actions";

const fr = { productionLocations };

const t = fr.productionLocations.media;
const HTTPS = /^https:\/\/\S+$/;

/** A photo, video or plan of a candidate: a file of the sheet or a link. */
export function LocationMediaForm({
  scope,
  optionId,
  onDone,
}: {
  scope: { projectId: string; sheetId: string; organizationId: string };
  optionId: string;
  onDone: () => void;
}) {
  const [media, setMedia] = useState<"file" | "link">("file");
  const [file, setFile] = useState<File | null>(null);
  const [missing, setMissing] = useState(false);
  const { pending, error, run } = useWriteSubmit(onDone, t.added);

  function submit(form: HTMLFormElement) {
    const url = String(new FormData(form).get("url") ?? "").trim();
    const lacks = media === "file" ? !file : !HTTPS.test(url);
    setMissing(lacks);
    if (lacks) return;
    run(async () => {
      if (media === "link")
        return addLocationMedia({ ...scope, optionId, fileId: null, url });
      const uploaded = await uploadProductionFile({
        ...scope,
        kind: "location",
        note: "",
        file: file!,
      });
      if (!uploaded.ok) return uploaded;
      return addLocationMedia({
        ...scope,
        optionId,
        fileId: uploaded.fileId,
        url: null,
      });
    });
  }

  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        submit(event.currentTarget);
      }}
    >
      <ChoiceCards
        name="media"
        legend={t.legend}
        value={media}
        onChange={(next) => {
          setMedia(next);
          setMissing(false);
        }}
        choices={[
          { value: "file" as const, label: t.file },
          { value: "link" as const, label: t.url },
        ]}
      />
      {media === "file" ? (
        <div className="flex flex-col gap-1.5">
          <FilePickField
            id={`location-media-${optionId}`}
            label={t.file}
            hint={t.fileHint}
            chosenLabel={t.fileChosen}
            file={file}
            onFile={setFile}
          />
          {missing && (
            <FieldError id={`location-media-${optionId}-error`}>
              {t.missingFile}
            </FieldError>
          )}
        </div>
      ) : (
        <Field
          name="url"
          type="url"
          label={t.url}
          required
          maxLength={2000}
          error={missing ? t.missingUrl : undefined}
        />
      )}
      <FormMessage kind="error">{error}</FormMessage>
      <DialogFormActions
        pending={pending}
        submitLabel={t.add}
        onCancel={onDone}
      />
    </form>
  );
}
