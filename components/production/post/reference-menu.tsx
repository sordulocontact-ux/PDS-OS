"use client";

import { fr } from "@/lib/i18n/fr";
import { deletePostReference } from "@/lib/production/post/reference-actions";

import { PostRowMenu } from "./post-row-menu";

const t = fr.productionPost.references;

/** « ⋯ » of a reference added in postproduction: « Supprimer ». */
export function ReferenceMenu({
  projectId,
  referenceId,
  label,
}: {
  projectId: string;
  referenceId: string;
  label: string;
}) {
  return (
    <PostRowMenu
      label={t.menu(label)}
      remove={{
        title: t.removeTitle,
        body: t.removeBody(label),
        done: t.removed,
        action: () => deletePostReference({ projectId, referenceId }),
      }}
    />
  );
}
