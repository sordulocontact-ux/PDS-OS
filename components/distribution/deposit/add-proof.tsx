"use client";

import { FormMessage } from "@/components/auth/form-message";
import { buttonVariants } from "@/components/ui/button";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { attachProof } from "@/lib/distribution/declare-actions";
import { removeProof, uploadProof } from "@/lib/distribution/upload-proof";
import { fr } from "@/lib/i18n/fr";

const t = fr.distributionJourney.orchard;

/** « Ajouter une preuve » on a point of the frieze declared without one:
 * the file goes to the bucket, then to that declaration (never replaced). */
export function AddProof({
  projectId,
  organizationId,
  declarationId,
}: {
  projectId: string;
  organizationId: string;
  declarationId: string;
}) {
  const { pending, error, run } = useWriteSubmit(() => {}, t.proofAdded);
  return (
    <span className="flex flex-col gap-1">
      <label
        className={buttonVariants({
          variant: "link",
          size: "xs",
          className: "h-auto px-0",
        })}
        aria-busy={pending || undefined}
      >
        {t.addProof}
        <input
          type="file"
          className="sr-only"
          disabled={pending}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            run(async () => {
              const up = await uploadProof({ organizationId, projectId, file });
              if ("error" in up) return { ok: false, error: up.error };
              const result = await attachProof({
                projectId,
                declarationId,
                proofPath: up.path,
                proofName: up.name,
              });
              if (!result.ok) await removeProof(up.path);
              return result;
            });
          }}
        />
      </label>
      <FormMessage kind="error">{error}</FormMessage>
    </span>
  );
}
