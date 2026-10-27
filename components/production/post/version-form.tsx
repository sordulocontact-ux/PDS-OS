"use client";

import { useRef, useState } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { Button } from "@/components/ui/button";
import { ChoiceCards } from "@/components/ui/choice-cards";
import type { Member } from "@/lib/framing/related";
import { productionPost } from "@/lib/i18n/fr/production-post";
import { uploadProductionFile } from "@/lib/production/files/upload";
import type { VersionTarget } from "@/lib/production/post/rules";
import type {
  PostScope,
  PostVersion,
  VersionDefaults,
} from "@/lib/production/post/types";
import { savePostVersion } from "@/lib/production/post/version-actions";
import type { NetworkOption } from "@/lib/production/sheet";

import { FilePickField } from "@/components/ui/file-pick-field";
import {
  HolderSelect,
  holderValue,
} from "@/components/production/holder-select";
import { useWriteSubmit } from "@/components/ui/use-write-submit";

const fr = { productionPost };

const t = fr.productionPost.versions;
const HTTPS = /^https:\/\/\S+$/;

type Media = "file" | "link";

/**
 * A version deposited: its number given by PDS OS (PROD-029), its author —
 * the editing step's provider proposed —, a file or a link, notes; then
 * « Enregistrer en brouillon » or « Soumettre aux retours » (one cycle,
 * PROD-033). Without a file or a link it is saved as a draft (the server
 * says so). `version`: a draft modified.
 */
export function VersionForm({
  scope,
  version,
  defaults,
  members,
  contacts,
  onDone,
}: {
  scope: PostScope;
  version: PostVersion | null;
  defaults: VersionDefaults;
  members: Member[];
  contacts: NetworkOption[];
  onDone: () => void;
}) {
  const [author, setAuthor] = useState(
    holderValue(version ? version.author : defaults.author),
  );
  const [media, setMedia] = useState<Media>(version?.url ? "link" : "file");
  const [file, setFile] = useState<File | null>(null);
  const [urlError, setUrlError] = useState(false);
  const target = useRef<VersionTarget>("draft");
  const done: Record<VersionTarget, string> = {
    draft: t.saved,
    review: t.submittedReview,
  };
  const { pending, error, run } = useWriteSubmit(onDone, t.saved);

  function submit(form: HTMLFormElement) {
    const data = new FormData(form);
    const url = media === "link" ? String(data.get("url") ?? "").trim() : "";
    const badUrl = url !== "" && !HTTPS.test(url);
    setUrlError(badUrl);
    if (badUrl) {
      form.querySelector<HTMLElement>("[aria-invalid=true]")?.focus();
      return;
    }
    const chosen = target.current;
    const keptFile = media === "file" ? (version?.file?.id ?? null) : null;
    run(async () => {
      let fileId = keptFile;
      if (media === "file" && file) {
        const uploaded = await uploadProductionFile({
          ...scope,
          kind: "version",
          note: "",
          file,
        });
        if (!uploaded.ok) return uploaded;
        fileId = uploaded.fileId;
      }
      return savePostVersion({
        projectId: scope.projectId,
        sheetId: scope.sheetId,
        versionId: version?.id,
        holder: author,
        fileId,
        url,
        notes: String(data.get("notes") ?? ""),
        target: chosen,
      });
    }, done[chosen]);
  }

  const submitButton = (value: VersionTarget, label: string) => (
    <Button
      type="submit"
      size="lg"
      variant={value === "review" ? "default" : "outline"}
      disabled={pending}
      onClick={() => (target.current = value)}
    >
      {label}
    </Button>
  );

  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        submit(event.currentTarget);
      }}
    >
      {!version && (
        <p className="text-sm text-muted-foreground">
          {t.numberHint(defaults.nextNumber)}
        </p>
      )}
      <HolderSelect
        id="post-version-author"
        label={t.author}
        noneLabel={t.authorNone}
        value={author}
        current={version?.author ?? null}
        members={members}
        contacts={contacts}
        onChange={setAuthor}
      />
      <ChoiceCards
        name="media"
        legend={t.mediaLegend}
        value={media}
        onChange={setMedia}
        choices={(["file", "link"] as const).map((m) => ({
          value: m,
          label: t.media[m].label,
          hint: t.media[m].hint,
        }))}
      />
      {media === "file" ? (
        <div className="flex flex-col gap-1.5">
          {version?.file && !file && (
            <p className="text-sm break-all text-muted-foreground">
              {t.keepFile(version.file.fileName)}
            </p>
          )}
          <FilePickField
            id="post-version-file"
            label={t.file}
            hint={t.fileHint}
            chosenLabel={fr.productionPost.references.fileChosen}
            file={file}
            onFile={setFile}
          />
        </div>
      ) : (
        <Field
          name="url"
          type="url"
          label={t.url}
          hint={fr.productionPost.references.urlHint}
          maxLength={2000}
          defaultValue={version?.url ?? ""}
          error={
            urlError ? fr.productionPost.references.missing.url : undefined
          }
        />
      )}
      <TextareaField
        name="notes"
        label={t.notes}
        rows={3}
        maxLength={4000}
        placeholder={t.notesPlaceholder}
        defaultValue={version?.notes ?? ""}
      />
      <FormMessage kind="error">{error}</FormMessage>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
        <Button type="button" variant="ghost" size="lg" onClick={onDone}>
          {fr.productionPost.cancel}
        </Button>
        {submitButton("draft", t.saveDraft)}
        {submitButton("review", t.submitReview)}
      </div>
    </form>
  );
}
