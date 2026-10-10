"use client";

import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { fr } from "@/lib/i18n/fr";
import { MAX_IMPORT_TEXT } from "@/lib/production/import-proposal";
import { cn } from "@/lib/utils";

/** The pasted organisation, then « Proposer ». Kept in the dialog only. */
export function ImportPasteForm({
  text,
  onTextChange,
  pending,
  error,
  onSubmit,
  onCancel,
}: {
  text: string;
  onTextChange: (text: string) => void;
  pending: boolean;
  error: string | null;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  const t = fr.productionImport;
  const tooLong = text.length > MAX_IMPORT_TEXT;
  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        if (!tooLong && text.trim()) onSubmit();
      }}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="production-import-text" required>
          {t.bodyLabel}
        </Label>
        <Textarea
          id="production-import-text"
          required
          rows={10}
          value={text}
          disabled={pending}
          onChange={(e) => onTextChange(e.target.value)}
          placeholder={t.bodyPlaceholder}
          aria-invalid={tooLong || undefined}
          aria-describedby="production-import-count"
          className="max-h-[50dvh] min-h-48 text-base md:text-sm"
        />
        <p
          id="production-import-count"
          className={cn(
            "text-caption text-muted-foreground tabular-nums",
            tooLong && "text-error",
          )}
        >
          {tooLong
            ? t.tooLong(MAX_IMPORT_TEXT)
            : t.count(text.length, MAX_IMPORT_TEXT)}
        </p>
      </div>
      <FormMessage kind="error">{error}</FormMessage>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="ghost"
          size="lg"
          disabled={pending}
          onClick={onCancel}
        >
          {t.cancel}
        </Button>
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? t.proposing : t.propose}
        </Button>
      </div>
    </form>
  );
}
