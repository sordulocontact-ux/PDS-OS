"use client";

import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { DialogButton } from "@/components/ui/dialog-button";
import { ReasonForm } from "@/components/ui/reason-form";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { decideArtistIdentity } from "@/lib/catalog/identity-actions";
import { artistIdentity } from "@/lib/i18n/fr/artist-identity";

const fr = { artistIdentity };

/** « Approuver » or « Refuser » (with a reason) a proposed version. */
export function IdentityDecision({
  artistId,
  versionId,
}: {
  artistId: string;
  versionId: string;
}) {
  const t = fr.artistIdentity;
  const { pending, error, run } = useWriteSubmit(() => {}, t.approved);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          disabled={pending}
          onClick={() =>
            run(() =>
              decideArtistIdentity({
                artistId,
                versionId,
                approve: true,
                comment: "",
              }),
            )
          }
        >
          {t.approve}
        </Button>
        <DialogButton
          label={t.reject}
          title={t.rejectTitle}
          description={t.rejectBody}
        >
          {(close) => (
            <ReasonForm
              label={t.rejectReason}
              submitLabel={t.reject}
              doneMessage={t.rejected}
              run={(reason) =>
                decideArtistIdentity({
                  artistId,
                  versionId,
                  approve: false,
                  comment: reason,
                })
              }
              onDone={close}
            />
          )}
        </DialogButton>
      </div>
      {error && <FormMessage kind="error">{error}</FormMessage>}
    </div>
  );
}
