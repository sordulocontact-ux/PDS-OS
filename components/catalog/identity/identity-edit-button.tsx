"use client";

import { IdentityForm } from "@/components/catalog/identity/identity-form";
import { DialogButton } from "@/components/ui/dialog-button";
import type { IdentityFields } from "@/lib/catalog/identity-fields";

/**
 * Opens the identity form in the modal: « Modifier l'identité » on the
 * artist's page, « Proposer une évolution de l'identité » from a release
 * (`projectId`).
 */
export function IdentityEditButton({
  artistId,
  projectId = null,
  initial,
  validates,
  label,
  title,
  description,
  variant = "outline",
}: {
  artistId: string;
  projectId?: string | null;
  initial: IdentityFields | null;
  validates: boolean;
  label: string;
  title: string;
  description: string;
  variant?: "default" | "outline" | "ghost";
}) {
  return (
    <DialogButton
      label={label}
      title={title}
      description={description}
      variant={variant}
      wide
    >
      {(close) => (
        <IdentityForm
          artistId={artistId}
          projectId={projectId}
          initial={initial}
          validates={validates}
          onDone={close}
        />
      )}
    </DialogButton>
  );
}
