"use client";

import { useState, type ReactNode } from "react";

import { FieldError } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { fr } from "@/lib/i18n/fr";

const t = fr.decisions.proposal;

/**
 * A proposal reworded in place (proto `itemRow` editing): the field
 * focused and filled with the words, PO's words under it (« Proposé : … »),
 * « Enregistrer » / « Annuler ». Entrée saves (Maj + Entrée goes to the
 * line), Échap cancels. Empty: red under the field, never a disabled button.
 */
export function ProposalEditor({
  id,
  defaultValue,
  original,
  pending,
  addon,
  onSave,
  onCancel,
}: {
  id: string;
  defaultValue: string;
  original: string;
  pending: boolean;
  addon?: ReactNode;
  onSave: (text: string) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState(defaultValue);
  const [missing, setMissing] = useState(false);
  const save = () => {
    const value = text.trim();
    setMissing(!value);
    if (value) onSave(value);
  };
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="sr-only">
        {t.textLabel}
      </label>
      <div className="relative">
        <Textarea
          id={id}
          autoFocus
          rows={2}
          maxLength={2000}
          value={text}
          disabled={pending}
          aria-invalid={missing || undefined}
          aria-describedby={missing ? `${id}-missing` : `${id}-original`}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              save();
            } else if (e.key === "Escape") {
              e.preventDefault();
              e.stopPropagation();
              onCancel();
            }
          }}
          className={addon ? "min-h-20 pb-12" : undefined}
        />
        {addon && (
          <div className="absolute inset-x-2 bottom-2 flex items-center">
            {addon}
          </div>
        )}
      </div>
      {missing && <FieldError id={`${id}-missing`}>{t.textRequired}</FieldError>}
      <span id={`${id}-original`} className="text-caption text-muted-foreground">
        {t.proposed(original)}
      </span>
      <div className="flex flex-wrap gap-2 pt-1">
        <Button size="sm" disabled={pending} aria-busy={pending || undefined} onClick={save}>
          {t.save}
        </Button>
        <Button variant="ghost" size="sm" disabled={pending} onClick={onCancel}>
          {t.cancel}
        </Button>
      </div>
    </div>
  );
}
