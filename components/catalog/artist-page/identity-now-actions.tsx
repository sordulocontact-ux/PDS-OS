"use client";

import { useEffect, useRef, useState } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { ReasonForm } from "@/components/ui/reason-form";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { decideArtistIdentity } from "@/lib/catalog/identity-actions";
import { artistIdentity } from "@/lib/i18n/fr/artist-identity";

const fr = { artistIdentity };

/**
 * The direction's decision in the artist's « Maintenant »: « Approuver la
 * Vn », or « Refuser », which opens its reason on the spot (required, said
 * in red when missing, never a disabled button) — the reason goes back to
 * the proposal's author.
 */
export function IdentityNowActions({
  artistId,
  versionId,
  number,
  author,
}: {
  artistId: string;
  versionId: string;
  number: number;
  author: string | null;
}) {
  const t = fr.artistIdentity;
  const [refusing, setRefusing] = useState(false);
  const reasonRef = useRef<HTMLDivElement>(null);
  const { pending, error, run } = useWriteSubmit(undefined, t.approved);

  // The reason takes the focus as soon as it opens.
  useEffect(() => {
    if (refusing) reasonRef.current?.querySelector("textarea")?.focus();
  }, [refusing]);

  if (refusing)
    return (
      <div ref={reasonRef}>
        <ReasonForm
          label={t.now.reason}
          hint={t.now.reasonHint(author)}
          submitLabel={t.now.refuseSubmit}
          doneMessage={t.rejected}
          run={(reason) =>
            decideArtistIdentity({
              artistId,
              versionId,
              approve: false,
              comment: reason,
            })
          }
          onDone={() => setRefusing(false)}
        />
      </div>
    );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <Button
          disabled={pending}
          aria-busy={pending || undefined}
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
          {t.now.approve(number)}
        </Button>
        <Button
          variant="outline"
          disabled={pending}
          onClick={() => setRefusing(true)}
        >
          {t.now.refuse}
        </Button>
      </div>
      {error && <FormMessage kind="error">{error}</FormMessage>}
    </div>
  );
}
