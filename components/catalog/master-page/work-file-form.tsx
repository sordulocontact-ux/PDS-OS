"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { OptionSelect } from "@/components/projects/option-select";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { FilePickField } from "@/components/ui/file-pick-field";
import { MAX_FILE_BYTES } from "@/lib/catalog/file-rules";
import {
  WORK_STATUSES,
  type MasterSession,
  type WorkItem,
  type WorkStatus,
} from "@/lib/catalog/master/rules";
import {
  saveWorkLink,
  updateWorkFile,
} from "@/lib/catalog/master/session-actions";
import { sessionLabel } from "@/lib/catalog/master/session-label";
import { uploadCatalogFile } from "@/lib/catalog/upload-file";
import { auth } from "@/lib/i18n/fr/auth";
import { masterPage } from "@/lib/i18n/fr/master-page";

const fr = { auth, masterPage };

const NONE = "none";

/**
 * A working file of a title (retours 36 à 38): a file deposited (stored
 * once, versioned), a link when it exceeds the storage limit, or the
 * session and state of one already there. The session is optional, the
 * state too; what is missing turns red after the first try.
 */
export function WorkFileForm({
  masterId,
  organizationId,
  sessions,
  mode,
  item,
  onDone,
}: {
  masterId: string;
  organizationId: string;
  sessions: MasterSession[];
  mode: "file" | "link";
  // Editing: its session and state (and a link's label and address).
  item: WorkItem | null;
  onDone: () => void;
}) {
  const t = fr.masterPage.workFiles;
  const [pending, startTransition] = useTransition();
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState(item?.description ?? "");
  const [label, setLabel] = useState(item?.kind === "link" ? item.name : "");
  const [url, setUrl] = useState(item?.url ?? "");
  const [sessionId, setSessionId] = useState(item?.sessionId ?? NONE);
  const [status, setStatus] = useState<string>(item?.status ?? NONE);
  const [tried, setTried] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const session = sessionId === NONE ? null : sessionId;
  const workStatus =
    status === NONE ? null : (WORK_STATUSES.find((s) => s === status) ?? null);
  const fileError =
    mode === "file" && !item
      ? !file
        ? t.fileRequired
        : file.size > MAX_FILE_BYTES
          ? t.tooLarge
          : null
      : null;
  const labelError =
    mode === "link" && !label.trim() ? fr.auth.errors.required : null;
  const urlError =
    mode === "link" && !/^https:\/\/\S+$/.test(url.trim())
      ? t.urlInvalid
      : null;

  function submit() {
    setTried(true);
    if (fileError || labelError || urlError) return;
    startTransition(async () => {
      const result =
        mode === "link"
          ? await saveWorkLink({
              masterId,
              linkId: item?.id ?? null,
              label,
              url: url.trim(),
              sessionId: session,
              status: workStatus,
            })
          : item
            ? await updateWorkFile({
                masterId,
                fileId: item.id,
                sessionId: session,
                status: workStatus,
              })
            : await uploadCatalogFile({
                organizationId,
                owner: { kind: "master", id: masterId },
                category: "stems",
                description: description.trim() || null,
                file: file!,
                sessionId: session,
                workStatus: workStatus as WorkStatus | null,
              });
      if (!result.ok) return setError(result.error);
      toast.success(t.saved);
      onDone();
    });
  }

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      {error && <FormMessage kind="error">{error}</FormMessage>}
      {mode === "file" && !item && (
        <>
          <FilePickField
            id="work-file"
            label={t.fields.file}
            hint={t.limit}
            chosenLabel={(name) => name}
            file={file}
            error={tried ? fileError : null}
            onFile={setFile}
          />
          <Field
            name="description"
            label={t.fields.description}
            hint={t.fields.descriptionHint}
            maxLength={200}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </>
      )}
      {mode === "link" && (
        <>
          <Field
            name="label"
            label={t.fields.label}
            aria-required
            maxLength={200}
            value={label}
            error={tried ? (labelError ?? undefined) : undefined}
            onChange={(e) => setLabel(e.target.value)}
          />
          <Field
            name="url"
            type="url"
            label={t.fields.url}
            hint={t.fields.urlHint}
            aria-required
            maxLength={2000}
            value={url}
            error={tried ? (urlError ?? undefined) : undefined}
            onChange={(e) => setUrl(e.target.value)}
          />
        </>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <OptionSelect
          name="sessionId"
          label={t.fields.session}
          items={{
            [NONE]: t.fields.noSession,
            ...Object.fromEntries(sessions.map((s) => [s.id, sessionLabel(s)])),
          }}
          defaultValue={sessionId}
          onValueChange={setSessionId}
        />
        <OptionSelect
          name="status"
          label={t.fields.status}
          items={{ [NONE]: t.noStatus, ...t.statuses }}
          defaultValue={status}
          onValueChange={setStatus}
        />
      </div>
      <DialogFormActions
        onCancel={onDone}
        submitLabel={t.save}
        pending={pending}
      />
    </form>
  );
}
