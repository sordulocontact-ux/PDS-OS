"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { productionPost } from "@/lib/i18n/fr/production-post";
import { versionName } from "@/lib/production/post/labels";
import type { VersionActions } from "@/lib/production/post/rules";
import type {
  PostPeople,
  PostScope,
  PostVersion,
} from "@/lib/production/post/types";
import {
  deletePostVersion,
  submitPostVersion,
} from "@/lib/production/post/version-actions";

import { PostRowMenu } from "./post-row-menu";
import { VersionDialog } from "./version-dialog";

const fr = { productionPost };

const t = fr.productionPost.versions;

/**
 * A draft's actions (versionActions): « Soumettre aux retours », once and
 * confirmed — the one cycle of PROD-033 —, and « ⋯ » Modifier / Supprimer.
 * The decision on a submitted version is taken in « Décision sur la
 * version ».
 */
export function VersionControls({
  scope,
  people,
  version,
  can,
}: {
  scope: PostScope;
  people: PostPeople;
  version: PostVersion;
  can: VersionActions;
}) {
  const name = versionName(version);
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const close = () => setSubmitting(false);
  const { pending, error, setError, run } = useWriteSubmit(close, t.saved);

  if (!can.submit && !can.edit) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {can.submit && (
        <Button size="sm" onClick={() => setSubmitting(true)}>
          {t.submitReview}
        </Button>
      )}
      {can.edit && (
        <PostRowMenu
          label={t.menu(name)}
          onEdit={() => setEditing(true)}
          remove={{
            title: t.removeTitle,
            body: t.removeBody(name),
            done: t.removed,
            action: () =>
              deletePostVersion({
                projectId: scope.projectId,
                versionId: version.id,
              }),
          }}
        />
      )}
      <ConfirmDialog
        open={submitting}
        onOpenChange={(open) => {
          if (open) return;
          setError(null);
          close();
        }}
        title={t.submitConfirmTitle(name)}
        description={t.submitConfirmBody}
        cancelLabel={fr.productionPost.cancel}
        closeLabel={fr.productionPost.close}
        confirmLabel={t.submitReview}
        pendingLabel={fr.productionPost.saving}
        pending={pending}
        error={error}
        onConfirm={() =>
          run(
            () =>
              submitPostVersion({
                projectId: scope.projectId,
                versionId: version.id,
              }),
            t.submittedReview,
          )
        }
      />
      {can.edit && (
        <VersionDialog
          scope={scope}
          people={people}
          open={editing}
          version={version}
          defaults={{ author: version.author, nextNumber: version.number }}
          onClose={() => setEditing(false)}
        />
      )}
    </div>
  );
}
