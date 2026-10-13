"use client";

import { toast } from "sonner";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { DialogButton } from "@/components/ui/dialog-button";
import { ReasonForm } from "@/components/ui/reason-form";
import {
  setIdentityDeviation,
  pickIdentityVersion,
} from "@/lib/catalog/identity-actions";
import type { IdentityRef } from "@/lib/catalog/identity-fields";
import { addLinkReference } from "@/lib/design/actions/reference-links";
import { DIRECTION_TARGET } from "@/lib/design/reference-rules";
import { fr } from "@/lib/i18n/fr";

const t = fr.artistIdentity.conception;

/** « Utiliser la Vn »: the release moves to the newer identity, on purpose. */
export function UseIdentityButton({
  projectId,
  versionId,
  number,
}: {
  projectId: string;
  versionId: string;
  number: number;
}) {
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const result = await pickIdentityVersion({ projectId, versionId });
          if (result.ok) toast.success(t.used_);
          else toast.error(result.error);
        })
      }
    >
      {t.use(number)}
    </Button>
  );
}

/** « Signaler une dérogation »: what this release does otherwise, in words. */
export function DeviationButton({
  projectId,
  current,
}: {
  projectId: string;
  current: string | null;
}) {
  return (
    <DialogButton
      label={current ? t.deviateEdit : t.deviate}
      title={t.deviateTitle}
      description={t.deviateBody}
    >
      {(close) => (
        <ReasonForm
          label={t.deviateLabel}
          submitLabel={t.deviateSave}
          doneMessage={t.deviated}
          required={false}
          defaultValue={current ?? undefined}
          run={(text) => setIdentityDeviation({ projectId, text })}
          onDone={close}
        />
      )}
    </DialogButton>
  );
}

/**
 * « Ajouter aux références de la sortie »: a link of the identity becomes a
 * reference of the release's direction, linked to the identity's version —
 * the identity itself is not touched.
 */
export function AddIdentityRefButton({
  projectId,
  versionId,
  identityRef,
}: {
  projectId: string;
  versionId: string;
  identityRef: IdentityRef;
}) {
  const [pending, start] = useTransition();
  return (
    <Button
      size="xs"
      variant="ghost"
      className="shrink-0 self-start sm:self-center"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const result = await addLinkReference({
            projectId,
            url: identityRef.url,
            title: identityRef.title ?? "",
            note: identityRef.note ?? "",
            targets: [DIRECTION_TARGET],
            identityVersionId: versionId,
            // MKT-C2-09: a moodboard of the identity stays a moodboard.
            type: identityRef.kind === "moodboard" ? "moodboard" : "reference",
          });
          if (result.ok) toast.success(t.added);
          else toast.error(result.error);
        })
      }
    >
      {t.addToRelease}
    </Button>
  );
}
