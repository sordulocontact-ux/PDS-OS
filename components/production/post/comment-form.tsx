"use client";

import { useState } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { productionPost } from "@/lib/i18n/fr/production-post";
import { uploadProductionFile } from "@/lib/production/files/upload";
import { addPostComment } from "@/lib/production/post/review-actions";
import {
  COMMENT_CATEGORIES,
  commentCategoryOf,
  type CommentCategory,
} from "@/lib/production/post/rules";
import { parseTimecode } from "@/lib/production/post/timecode";
import type { PostScope } from "@/lib/production/post/types";

import { FilePickField } from "@/components/ui/file-pick-field";
import { useWriteSubmit } from "@/components/ui/use-write-submit";

const fr = { productionPost };

const t = fr.productionPost.comments;

/**
 * A feedback on one version: a timecode typed as mm:ss or hh:mm:ss (none = a
 * general comment), a category, the comment, and an attachment for the owner
 * (who alone uploads files while Production runs).
 */
export function CommentForm({
  scope,
  versionId,
  canAttach,
  onDone,
}: {
  scope: PostScope;
  versionId: string;
  canAttach: boolean;
  onDone: () => void;
}) {
  const [category, setCategory] = useState<CommentCategory>("edit");
  const [file, setFile] = useState<File | null>(null);
  const [missing, setMissing] = useState<"timecode" | "body" | null>(null);
  const { pending, error, run } = useWriteSubmit(onDone, t.done);

  function submit(form: HTMLFormElement) {
    const data = new FormData(form);
    const timecode = String(data.get("timecode") ?? "");
    const body = String(data.get("body") ?? "");
    const lack = !parseTimecode(timecode).ok
      ? "timecode"
      : body.trim() === ""
        ? "body"
        : null;
    setMissing(lack);
    if (lack) {
      form.querySelector<HTMLElement>("[aria-invalid=true]")?.focus();
      return;
    }
    run(async () => {
      let fileId: string | null = null;
      if (canAttach && file) {
        const uploaded = await uploadProductionFile({
          ...scope,
          kind: "attachment",
          note: "",
          file,
        });
        if (!uploaded.ok) return uploaded;
        fileId = uploaded.fileId;
      }
      return addPostComment({
        projectId: scope.projectId,
        versionId,
        timecode,
        category,
        body,
        fileId,
      });
    });
  }

  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        submit(event.currentTarget);
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          name="timecode"
          label={t.timecode}
          hint={t.timecodeHint}
          placeholder="01:24"
          maxLength={12}
          autoComplete="off"
          error={missing === "timecode" ? t.timecodeInvalid : undefined}
        />
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="post-comment-category" required>
            {t.category}
          </Label>
          <Select
            items={t.categories}
            value={category}
            onValueChange={(next) => {
              const parsed = commentCategoryOf(next);
              if (parsed) setCategory(parsed);
            }}
          >
            <SelectTrigger
              id="post-comment-category"
              className="w-full text-base data-[size=default]:h-10 md:text-sm"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COMMENT_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {t.categories[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <TextareaField
        name="body"
        label={t.body}
        rows={4}
        maxLength={2000}
        aria-required
        error={missing === "body" ? t.bodyMissing : undefined}
      />
      {canAttach && (
        <FilePickField
          id="post-comment-file"
          label={t.attachment}
          hint={t.attachmentHint}
          chosenLabel={fr.productionPost.references.fileChosen}
          file={file}
          onFile={setFile}
        />
      )}
      <FormMessage kind="error">{error}</FormMessage>
      <DialogFormActions
        pending={pending}
        submitLabel={t.add}
        onCancel={onDone}
      />
    </form>
  );
}
