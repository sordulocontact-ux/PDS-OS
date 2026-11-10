"use client";

import { FormMessage } from "@/components/auth/form-message";
import { IconRefresh } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { readLinkStats } from "@/lib/activations/stats-actions";
import type { ActivationScope } from "@/lib/activations/types";
import { activations } from "@/lib/i18n/fr/activations";

const fr = { activations };

const t = fr.activations.metrics.auto;

/**
 * « Relever les statistiques » (Sacha 10/11/2026): one click reads the
 * public figures of the TikTok, YouTube and Deezer links declared as proofs
 * and records them as snapshots; the toast says what was read and what is
 * left to note by hand. Shown only when such a link exists (`platforms`).
 */
export function ReadStatsButton({
  scope,
  targetId = null,
  platforms,
}: {
  scope: ActivationScope;
  targetId?: string | null;
  platforms: string[];
}) {
  const { pending, error, run } = useWriteSubmit(undefined, "");
  return (
    <span className="flex flex-col items-end gap-1">
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={pending}
        title={t.readHint(platforms.join(", "))}
        onClick={() =>
          run(() =>
            readLinkStats({
              projectId: scope.projectId,
              activationId: scope.activationId,
              targetId,
            }),
          )
        }
      >
        <IconRefresh aria-hidden />
        {t.read}
      </Button>
      {error && <FormMessage kind="error">{error}</FormMessage>}
    </span>
  );
}
