"use client";

import { IconLink, IconPaperclip } from "nucleo-sharp-essential";
import { useRef, useState } from "react";

import { useFramingAction } from "@/components/framing/use-framing-action";
import { Button } from "@/components/ui/button";
import { FilterChip } from "@/components/ui/filter-chip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { addDesignLink } from "@/lib/design/actions";
import { isHttpsUrl } from "@/lib/design/rules";
import { uploadDesignFile } from "@/lib/design/upload-version";
import { formatFileSize } from "@/lib/catalog/file-rules";
import { fr } from "@/lib/i18n/fr";

type Kind = "file" | "link";

/**
 * "Déposer une version": a side panel, so the deliverable and its previous
 * versions stay in view. A file goes to the private bucket; anything heavier
 * (a clip) is deposited as a link.
 */
export function DepositVersion({
  organizationId,
  projectId,
  deliverableId,
  target,
}: {
  organizationId: string;
  projectId: string;
  deliverableId: string | null;
  // What the version is for, shown in the panel title.
  target: string;
}) {
  const t = fr.design.deposit;
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={<Button variant="outline" size="sm" className="w-fit" />}
      >
        <IconPaperclip aria-hidden data-icon="inline-start" />
        {t.open}
      </SheetTrigger>
      <SheetContent className="gap-0 overflow-y-auto data-[side=right]:w-full data-[side=right]:sm:max-w-md">
        <SheetHeader className="px-5 pt-5 pr-14">
          <SheetTitle>{t.title(target)}</SheetTitle>
          <SheetDescription>{t.description}</SheetDescription>
        </SheetHeader>
        {/* Mounted per opening: the form always starts empty. */}
        {open && (
          <DepositForm
            organizationId={organizationId}
            projectId={projectId}
            deliverableId={deliverableId}
            onDone={() => setOpen(false)}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

function DepositForm({
  organizationId,
  projectId,
  deliverableId,
  onDone,
}: {
  organizationId: string;
  projectId: string;
  deliverableId: string | null;
  onDone: () => void;
}) {
  const t = fr.design.deposit;
  const { pending, run } = useFramingAction();
  const fileInput = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<Kind>("file");
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const ready = kind === "file" ? file !== null : isHttpsUrl(url.trim());

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ready) return;
    run(
      () =>
        kind === "file" && file
          ? uploadDesignFile({
              organizationId,
              projectId,
              deliverableId,
              note,
              file,
            })
          : addDesignLink({ projectId, deliverableId, url: url.trim(), note }),
      onDone,
    );
  }

  return (
    <form className="grid gap-5 p-5" onSubmit={submit} aria-busy={pending}>
      <div role="group" aria-label={t.open} className="flex gap-2">
        <FilterChip
          pressed={kind === "file"}
          disabled={pending}
          onClick={() => setKind("file")}
        >
          <IconPaperclip aria-hidden className="size-4" />
          {t.file}
        </FilterChip>
        <FilterChip
          pressed={kind === "link"}
          disabled={pending}
          onClick={() => setKind("link")}
        >
          <IconLink aria-hidden className="size-4" />
          {t.link}
        </FilterChip>
      </div>

      {kind === "file" ? (
        <div className="grid gap-2">
          <Label htmlFor="design-file" required>
            {t.fileLabel}
          </Label>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => fileInput.current?.click()}
            >
              {t.pickFile}
            </Button>
            <span className="min-w-0 truncate text-sm text-muted-foreground">
              {file ? `${file.name} · ${formatFileSize(file.size)}` : t.noFile}
            </span>
          </div>
          <input
            ref={fileInput}
            id="design-file"
            type="file"
            aria-required="true"
            className="sr-only"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
          <p className="text-xs text-muted-foreground">{t.fileHint}</p>
        </div>
      ) : (
        <div className="grid gap-2">
          <Label htmlFor="design-url" required>
            {t.urlLabel}
          </Label>
          <Input
            id="design-url"
            type="url"
            aria-required="true"
            inputMode="url"
            autoComplete="off"
            placeholder={t.urlPlaceholder}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            maxLength={2000}
            disabled={pending}
          />
          <p className="text-xs text-muted-foreground">{t.urlHint}</p>
        </div>
      )}

      <div className="grid gap-2">
        <Label htmlFor="design-note">{t.noteLabel}</Label>
        <Textarea
          id="design-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t.notePlaceholder}
          maxLength={1000}
          rows={3}
          disabled={pending}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending || !ready}>
          {pending ? t.submitting : t.submit}
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={pending}
          onClick={onDone}
        >
          {t.cancel}
        </Button>
      </div>
    </form>
  );
}
