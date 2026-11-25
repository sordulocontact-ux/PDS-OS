"use client";

import { IconPaperclip } from "nucleo-sharp-essential";
import { useImperativeHandle, useRef, useState, useTransition } from "react";

import { FieldError } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { useFileDrop } from "@/components/ui/use-file-drop";
import { legalContracts } from "@/lib/i18n/fr/legal-contracts";
import { cn } from "@/lib/utils";
import { SOURCE_ACCEPT } from "@/lib/legal/contracts/source-rules";
import {
  uploadTemplateSource,
  type TemplateSource,
} from "@/lib/legal/contracts/upload-source";
import type { DocumentFont } from "@/lib/legal/contracts/document-fonts";

const fr = { legalContracts };

export type TemplateSourceHandle = {
  /** A file dropped elsewhere (the contract's page) read as if imported. */
  read(file: File): void;
};

/**
 * « Fichier source » of a template: a Word, PDF or text file chosen or
 * dropped here, kept with the template; its text goes to the editor
 * (`onText`). Submitted as source_path / source_name.
 */
export function TemplateSourceField({
  ref,
  organizationId,
  initial,
  onText,
}: {
  ref?: React.Ref<TemplateSourceHandle>;
  organizationId: string;
  initial: TemplateSource | null;
  onText: (text: string, name: string, font: DocumentFont | null) => void;
}) {
  const t = fr.legalContracts.templates.source;
  const input = useRef<HTMLInputElement>(null);
  const [source, setSource] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const read = (file: File) =>
    startTransition(async () => {
      setError(null);
      const result = await uploadTemplateSource(organizationId, file);
      if (!result.ok) return setError(result.error);
      setSource(result.source);
      onText(result.text, result.source.name, result.font);
    });
  useImperativeHandle(ref, () => ({ read }));
  const { dragging, handlers } = useFileDrop({
    disabled: pending,
    onFiles: ([file]) => read(file),
  });
  const pdf = source?.name.toLowerCase().endsWith(".pdf");

  return (
    <section
      {...handlers}
      aria-busy={pending || undefined}
      className={cn(
        "flex flex-col gap-2 rounded-lg bg-[var(--surface-soft)] p-3 outline-2 outline-transparent transition-[outline-color] outline-dashed",
        dragging && "outline-[var(--selection)]",
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h3 className="text-sm font-medium">{t.title}</h3>
          <p className="text-sm text-muted-foreground">
            {dragging ? t.drop : t.description}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          {source && !pending && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setSource(null)}
            >
              {t.remove}
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => input.current?.click()}
          >
            {pending ? t.reading : source ? t.replace : t.import}
          </Button>
        </div>
      </div>
      {source && (
        <p className="flex min-w-0 items-center gap-1.5 text-sm">
          <IconPaperclip aria-hidden className="size-4 shrink-0" />
          <span className="break-all">{t.current(source.name)}</span>
        </p>
      )}
      {source && pdf && (
        <p className="text-sm text-muted-foreground">{t.pdfNote}</p>
      )}
      {error && <FieldError id="template-source-error">{error}</FieldError>}
      <input
        ref={input}
        type="file"
        accept={SOURCE_ACCEPT}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) read(file);
        }}
      />
      <input type="hidden" name="source_path" value={source?.path ?? ""} />
      <input type="hidden" name="source_name" value={source?.name ?? ""} />
    </section>
  );
}
