"use client";

import { useState } from "react";

import type { PageChoice } from "@/components/strategy/generator/pages-step";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/form-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { fr } from "@/lib/i18n/fr";

/**
 * « Modifier » a page of the recap: its title, and a text of the owner's,
 * set above what PO assembled (the free page is only this text).
 */
export function PageEditDialog({
  page,
  defaultTitle,
  onClose,
  onSave,
}: {
  // null: closed.
  page: PageChoice | null;
  defaultTitle: string;
  onClose: () => void;
  onSave: (page: PageChoice) => void;
}) {
  const t = fr.strategyDocs;
  return (
    <FormDialog
      open={page !== null}
      onOpenChange={(open) => !open && onClose()}
      title={
        page ? t.generator.editLabel(page.title?.trim() || defaultTitle) : ""
      }
      description={t.plan.pageEditBody}
      closeLabel={t.generator.close}
    >
      {page && (
        <PageForm
          page={page}
          defaultTitle={defaultTitle}
          onCancel={onClose}
          onSave={onSave}
        />
      )}
    </FormDialog>
  );
}

function PageForm({
  page,
  defaultTitle,
  onCancel,
  onSave,
}: {
  page: PageChoice;
  defaultTitle: string;
  onCancel: () => void;
  onSave: (page: PageChoice) => void;
}) {
  const t = fr.strategyDocs;
  const [title, setTitle] = useState(page.title ?? "");
  const [text, setText] = useState(page.text ?? "");
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({
          ...page,
          title: title.trim() || undefined,
          text: page.key === "cover" ? undefined : text.trim() || undefined,
        });
      }}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="page-title">{t.plan.pageTitle}</Label>
        <Input
          id="page-title"
          value={title}
          maxLength={120}
          placeholder={defaultTitle}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      {page.key !== "cover" && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="page-text">{t.plan.pageText}</Label>
          <Textarea
            id="page-text"
            value={text}
            maxLength={4000}
            rows={6}
            onChange={(e) => setText(e.target.value)}
          />
        </div>
      )}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" size="lg" onClick={onCancel}>
          {fr.framingIntel.guide.cancel}
        </Button>
        <Button type="submit" size="lg">
          {t.generator.save}
        </Button>
      </div>
    </form>
  );
}
