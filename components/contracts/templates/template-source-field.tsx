"use client";

import { IconFile } from "nucleo-sharp-essential";
import { useImperativeHandle, useState, useTransition } from "react";

import { FieldError } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { FileDropZone } from "@/components/ui/file-drop-zone";
import { ChosenFileRow } from "@/components/ui/file-pick-field";
import { legalContracts } from "@/lib/i18n/fr/legal-contracts";
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
 * « Fichier source » of a template: a Word, PDF or text file dropped or
 * chosen, kept with the template; its text goes to the editor (`onText`).
 * The same drop zone, then the same line with « Remplacer », as every file
 * chosen for a form (Sacha 26/11/2026: « c'est pas le même composant »).
 * Submitted as source_path / source_name.
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
  const pdf = source?.name.toLowerCase().endsWith(".pdf");
  const describedBy = error ? "template-source-error" : undefined;

  return (
    <div className="flex flex-col gap-1.5" aria-busy={pending || undefined}>
      {source && !pending ? (
        <ChosenFileRow
          label={t.title}
          name={source.name}
          accept={SOURCE_ACCEPT}
          describedBy={describedBy}
          spoken={t.current(source.name)}
          extra={
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setSource(null)}
            >
              {t.remove}
            </Button>
          }
          onFile={read}
        />
      ) : (
        <FileDropZone
          label={pending ? t.reading : t.title}
          hint={t.hint}
          accept={SOURCE_ACCEPT}
          icon={IconFile}
          disabled={pending}
          describedBy={describedBy}
          onFiles={([file]) => file && read(file)}
        />
      )}
      {source && pdf && !pending && (
        <p className="text-sm text-muted-foreground">{t.pdfNote}</p>
      )}
      {error && <FieldError id="template-source-error">{error}</FieldError>}
      <input type="hidden" name="source_path" value={source?.path ?? ""} />
      <input type="hidden" name="source_name" value={source?.name ?? ""} />
    </div>
  );
}
