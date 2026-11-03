"use client";

import { IconFile } from "nucleo-sharp-essential";
import { useState, useTransition } from "react";
import { toast } from "@/components/ui/toast";

import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/form-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { importDesignBrief } from "@/lib/design/actions/import";
import { MAX_IMPORT_CHARS } from "@/lib/design/intentions";
import { conceptionWork } from "@/lib/i18n/fr/conception-work";
import { cn } from "@/lib/utils";

const fr = { conceptionWork };

/**
 * « Importer un brief existant »: a text written elsewhere, pasted or read
 * from a text file in the browser. Kept as a source; PO proposes the
 * intentions it reads there, each to confirm.
 */
export function ImportBriefDialog({ projectId }: { projectId: string }) {
  const t = fr.conceptionWork.import;
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();
  const tooLong = body.length > MAX_IMPORT_CHARS;

  const readFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      setBody(await file.text());
    } catch {
      toast.error(t.fileUnreadable);
    }
  };

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <IconFile aria-hidden />
        {t.open}
      </Button>
      <FormDialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setBody("");
        }}
        title={t.dialogTitle}
        description={t.dialogDescription}
        closeLabel={t.cancel}
        size="wide"
      >
        <form
          className="flex flex-col gap-6"
          onSubmit={(e) => {
            e.preventDefault();
            if (tooLong) return;
            const title = String(new FormData(e.currentTarget).get("title"));
            startTransition(async () => {
              const result = await importDesignBrief(projectId, title, body);
              if (!result.ok) return void toast.error(result.error);
              if (result.count === null)
                toast.warning(result.quota ?? t.providerFailed);
              else toast.success(t.done(result.count));
              setOpen(false);
              setBody("");
            });
          }}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="design-import-title" required>
              {t.titleLabel}
            </Label>
            <Input
              id="design-import-title"
              name="title"
              required
              maxLength={200}
              placeholder={t.titlePlaceholder}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="design-import-body" required>
              {t.bodyLabel}
            </Label>
            <Textarea
              id="design-import-body"
              required
              rows={10}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={t.bodyPlaceholder}
              aria-invalid={tooLong || undefined}
              aria-describedby="design-import-count"
              className="max-h-[50dvh] min-h-48 text-base md:text-sm"
            />
            <p
              id="design-import-count"
              className={cn(
                "text-caption text-muted-foreground tabular-nums",
                tooLong && "text-[color:var(--tone-danger-fg)]",
              )}
            >
              {tooLong
                ? t.tooLong(MAX_IMPORT_CHARS)
                : t.count(body.length, MAX_IMPORT_CHARS)}
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="design-import-file">{t.fileLabel}</Label>
            <Input
              id="design-import-file"
              type="file"
              accept=".txt,.md,text/plain,text/markdown"
              onChange={(e) => void readFile(e.target.files?.[0])}
            />
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              size="lg"
              onClick={() => setOpen(false)}
            >
              {t.cancel}
            </Button>
            <Button type="submit" size="lg" disabled={pending || tooLong}>
              {pending ? t.submitting : t.submit}
            </Button>
          </div>
        </form>
      </FormDialog>
    </>
  );
}
