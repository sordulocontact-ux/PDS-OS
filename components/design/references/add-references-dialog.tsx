"use client";

import { IconLink, IconPaperclip, IconPlus } from "nucleo-sharp-essential";
import { useState } from "react";
import { toast } from "sonner";

import { FormMessage } from "@/components/auth/form-message";
import { ChosenFiles } from "@/components/design/references/chosen-files";
import {
  TargetPicker,
  type TargetOption,
} from "@/components/design/references/target-picker";
import { Button } from "@/components/ui/button";
import { FileDropZone } from "@/components/ui/file-drop-zone";
import { FilterChip } from "@/components/ui/filter-chip";
import { FormDialog } from "@/components/ui/form-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { addLinkReference } from "@/lib/design/actions/reference-links";
import { REFERENCE_ACCEPT } from "@/lib/design/reference-rules";
import { uploadReferenceFile } from "@/lib/design/upload-reference";
import { fr } from "@/lib/i18n/fr";

type Props = {
  organizationId: string;
  projectId: string;
  options: TargetOption[];
  // Pre-chosen targets (the section it is opened from).
  initialTargets?: string[];
};

/** « Déposer des références »: files or a link, for any number of targets. */
export function AddReferencesDialog(props: Props) {
  const t = fr.conceptionRefs.add;
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <IconPlus aria-hidden data-icon="inline-start" />
        {t.open}
      </Button>
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={t.title}
        description={t.description}
        closeLabel={t.close}
        size="wide"
      >
        <AddReferencesForm {...props} onDone={() => setOpen(false)} />
      </FormDialog>
    </>
  );
}

function AddReferencesForm({
  organizationId,
  projectId,
  options,
  initialTargets = [],
  onDone,
}: Props & { onDone: () => void }) {
  const t = fr.conceptionRefs.add;
  const [kind, setKind] = useState<"file" | "link">("file");
  const [files, setFiles] = useState<File[]>([]);
  const [targets, setTargets] = useState(initialTargets);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  async function submit(form: FormData) {
    const title = String(form.get("title") ?? "");
    const note = String(form.get("note") ?? "");
    const url = String(form.get("url") ?? "").trim();
    if (kind === "file" ? files.length === 0 : !url)
      return setErrors([t.nothing]);
    setBusy(true);
    setErrors([]);
    const failed: string[] = [];
    let added = 0;
    if (kind === "link") {
      const result = await addLinkReference({
        projectId,
        url,
        title,
        note,
        targets,
      });
      if (!result.ok) failed.push(result.error);
      else if (result.deduped) toast.info(t.deduped(url));
      else added += 1;
    } else {
      // One after the other: each is hashed, then uploaded or only linked.
      for (const file of files) {
        const result = await uploadReferenceFile({
          organizationId,
          projectId,
          file,
          // A title names one reference, never a batch.
          title: files.length === 1 ? title : "",
          note,
          targets,
        });
        if (!result.ok) failed.push(result.error);
        else if (result.deduped) toast.info(t.deduped(file.name));
        else added += 1;
      }
    }
    setBusy(false);
    if (added > 0) toast.success(t.added(added));
    if (failed.length) return setErrors(failed);
    onDone();
  }

  return (
    <form
      className="flex flex-col gap-6"
      aria-busy={busy}
      onSubmit={(e) => {
        e.preventDefault();
        void submit(new FormData(e.currentTarget));
      }}
    >
      <div role="group" aria-label={t.kindLabel} className="flex gap-2">
        <FilterChip pressed={kind === "file"} onClick={() => setKind("file")}>
          <IconPaperclip aria-hidden className="size-4" />
          {t.file}
        </FilterChip>
        <FilterChip pressed={kind === "link"} onClick={() => setKind("link")}>
          <IconLink aria-hidden className="size-4" />
          {t.link}
        </FilterChip>
      </div>

      {kind === "file" ? (
        <div className="flex flex-col gap-3">
          <FileDropZone
            label={t.dropLabel}
            hint={t.dropHint}
            accept={REFERENCE_ACCEPT}
            multiple
            disabled={busy}
            onFiles={(picked) => setFiles((list) => [...list, ...picked])}
          />
          <ChosenFiles
            files={files}
            disabled={busy}
            onRemove={(index) =>
              setFiles((list) => list.filter((_, i) => i !== index))
            }
          />
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="reference-url" required>
            {t.urlLabel}
          </Label>
          <Input
            id="reference-url"
            name="url"
            type="url"
            inputMode="url"
            required
            maxLength={2000}
            pattern="https://.+"
            placeholder={t.urlPlaceholder}
            disabled={busy}
          />
          <p className="text-sm text-muted-foreground">{t.urlHint}</p>
        </div>
      )}

      {(kind === "link" || files.length <= 1) && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="reference-title">{t.titleLabel}</Label>
          <Input
            id="reference-title"
            name="title"
            maxLength={200}
            placeholder={t.titlePlaceholder}
            disabled={busy}
          />
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="reference-note">{t.noteLabel}</Label>
        <Textarea
          id="reference-note"
          name="note"
          rows={3}
          maxLength={500}
          placeholder={t.notePlaceholder}
          disabled={busy}
        />
      </div>
      <TargetPicker
        legend={t.targetsLegend}
        hint={t.targetsHint}
        options={options}
        value={targets}
        onChange={setTargets}
        disabled={busy}
      />

      {errors.map((error) => (
        <FormMessage key={error} kind="error">
          {error}
        </FormMessage>
      ))}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" size="lg" onClick={onDone}>
          {t.cancel}
        </Button>
        <Button type="submit" size="lg" disabled={busy}>
          {busy ? t.submitting : t.submit}
        </Button>
      </div>
    </form>
  );
}
