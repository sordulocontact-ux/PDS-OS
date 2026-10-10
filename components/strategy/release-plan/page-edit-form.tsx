"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { fr } from "@/lib/i18n/fr";
import type { AnyPageChoice } from "@/lib/strategy/documents/release-plan-model";

/** « Modifier » a page: its own title and a text put at its head. */
export function PageEditForm({
  page,
  name,
  onSave,
  onCancel,
}: {
  page: AnyPageChoice;
  // The page's proposed name, as a placeholder.
  name: string;
  onSave: (patch: { title?: string; text?: string }) => void;
  onCancel: () => void;
}) {
  const t = fr.strategyReleasePlan.pages;
  const a = fr.strategyReleasePlan.actions;
  const [title, setTitle] = useState(page.title ?? "");
  const [text, setText] = useState(page.text ?? "");
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({
          title: title.trim() || undefined,
          text: text.trim() || undefined,
        });
      }}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="page-title">{t.pageTitle}</Label>
        <Input
          id="page-title"
          value={title}
          maxLength={120}
          placeholder={name}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="page-text">{t.pageText}</Label>
        <Textarea
          id="page-text"
          value={text}
          maxLength={4000}
          rows={6}
          onChange={(e) => setText(e.target.value)}
        />
      </div>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" onClick={onCancel}>
          {a.cancel}
        </Button>
        <Button type="submit">{a.save}</Button>
      </div>
    </form>
  );
}
