"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { fr } from "@/lib/i18n/fr";
import { finishStepByLink } from "@/lib/production/provider/public-actions";

const t = fr.productionProvider.mission;

/** « Mission terminée » on the provider's own step (PROD-026). */
export function FinishStepButton({
  token,
  stepId,
}: {
  token: string;
  stepId: string;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      aria-busy={pending || undefined}
      onClick={() =>
        startTransition(async () => {
          const result = await finishStepByLink({ token, stepId });
          if (!result.ok) return void toast.error(result.error);
          toast.success(t.finished);
        })
      }
    >
      {t.finish}
    </Button>
  );
}
