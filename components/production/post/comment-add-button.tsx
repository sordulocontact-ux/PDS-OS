"use client";

import { IconPlus } from "nucleo-sharp-essential";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/form-dialog";
import { productionPost } from "@/lib/i18n/fr/production-post";
import type { PostScope } from "@/lib/production/post/types";

import { CommentForm } from "./comment-form";

const fr = { productionPost };

const t = fr.productionPost;

/** « Ajouter un retour » on a version and its dialog. */
export function CommentAddButton({
  scope,
  versionId,
  name,
  canAttach,
}: {
  scope: PostScope;
  versionId: string;
  name: string;
  canAttach: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <IconPlus aria-hidden data-icon="inline-start" />
        {t.comments.add}
      </Button>
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={t.comments.addTitle(name)}
        description={t.comments.addDescription}
        closeLabel={t.close}
      >
        <CommentForm
          scope={scope}
          versionId={versionId}
          canAttach={canAttach}
          onDone={() => setOpen(false)}
        />
      </FormDialog>
    </>
  );
}
