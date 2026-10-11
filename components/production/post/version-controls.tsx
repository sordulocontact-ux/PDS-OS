"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { fr } from "@/lib/i18n/fr";
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
import { RequestChangesButton } from "./request-changes-button";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { VersionDialog } from "./version-dialog";

const t = fr.productionPost.versions;

type Submit = "review" | "final";

/**
 * A version's actions, as its status and the person's role allow
 * (versionActions): « Soumettre pour retours » and « Soumettre à validation
 * finale », two different actions, each confirmed; « Demander des
 * corrections » for a reviewer; « ⋯ » Modifier / Supprimer on a draft.
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
  const [submitting, setSubmitting] = useState<Submit | null>(null);
  const close = () => setSubmitting(null);
  const { pending, error, setError, run } = useWriteSubmit(close, t.saved);

  const confirm = (target: Submit) =>
    run(
      () =>
        submitPostVersion({
          projectId: scope.projectId,
          versionId: version.id,
          target,
        }),
      target === "review" ? t.submittedReview : t.submittedFinal,
    );

  return (
    <div className="flex flex-wrap items-center gap-2">
      {can.requestChanges && (
        <RequestChangesButton
          projectId={scope.projectId}
          versionId={version.id}
          name={name}
        />
      )}
      {can.submitReview && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSubmitting("review")}
        >
          {t.submitReview}
        </Button>
      )}
      {can.submitFinal && (
        <Button size="sm" onClick={() => setSubmitting("final")}>
          {t.submitFinal}
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
        open={submitting !== null}
        onOpenChange={(open) => {
          if (open) return;
          setError(null);
          close();
        }}
        title={
          submitting === "final"
            ? t.finalConfirmTitle(name)
            : t.submitConfirmTitle(name)
        }
        description={
          submitting === "final" ? t.finalConfirmBody : t.submitConfirmBody
        }
        cancelLabel={fr.productionPost.cancel}
        closeLabel={fr.productionPost.close}
        confirmLabel={submitting === "final" ? t.submitFinal : t.submitReview}
        pendingLabel={fr.productionPost.saving}
        pending={pending}
        error={error}
        onConfirm={() => submitting && confirm(submitting)}
      />
      {can.edit && (
        <VersionDialog
          scope={scope}
          people={people}
          open={editing}
          version={version}
          onClose={() => setEditing(false)}
        />
      )}
    </div>
  );
}
