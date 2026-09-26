"use client";

import { IconPaperclip } from "nucleo-sharp-essential";
import { useRef, useState, useTransition } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { FilterChip } from "@/components/ui/filter-chip";
import { FILE_CATEGORIES, type FileCategory } from "@/lib/catalog/file-rules";
import { uploadArtistFile } from "@/lib/catalog/upload-file";
import { fr } from "@/lib/i18n/fr";

// Adds a file at once: pick the category, then the file. The list refreshes
// from the server once it is recorded.
export function FileUpload({
  organizationId,
  artistId,
}: {
  organizationId: string;
  artistId: string;
}) {
  const t = fr.artistFiles;
  const input = useRef<HTMLInputElement>(null);
  const [category, setCategory] = useState<FileCategory>("other");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function upload(file: File | undefined) {
    if (!file) return;
    setError(null);
    startTransition(async () => {
      const result = await uploadArtistFile({
        organizationId,
        artistId,
        category,
        file,
      });
      if (!result.ok) setError(result.error);
      if (input.current) input.current.value = "";
    });
  }

  return (
    <div className="flex flex-col gap-3" aria-busy={pending || undefined}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="group"
          aria-label={t.upload.categoryLabel}
          className="flex flex-wrap gap-2"
        >
          {FILE_CATEGORIES.map((value) => (
            <FilterChip
              key={value}
              pressed={category === value}
              disabled={pending}
              onClick={() => setCategory(value)}
            >
              {t.categories[value]}
            </FilterChip>
          ))}
        </div>
        <Button
          type="button"
          size="lg"
          disabled={pending}
          onClick={() => input.current?.click()}
        >
          <IconPaperclip aria-hidden data-icon="inline-start" />
          {pending ? t.upload.uploading : t.upload.add}
        </Button>
      </div>
      <input
        ref={input}
        type="file"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(event) => upload(event.target.files?.[0])}
      />
      <p className="text-xs text-muted-foreground">{t.upload.hint}</p>
      {error && <FormMessage kind="error">{error}</FormMessage>}
    </div>
  );
}
