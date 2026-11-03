"use client";

import { useTransition } from "react";
import { toast } from "@/components/ui/toast";

import { Button } from "@/components/ui/button";
import { strategyReleasePlan } from "@/lib/i18n/fr/strategy-release-plan";
import { shareReleasePlan } from "@/lib/strategy/actions/release-plan";

const fr = { strategyReleasePlan };

/**
 * « Partager »: the version's public link (/d/[token]), created once by the
 * database then reused, copied to the clipboard. The Plan de sortie is meant
 * for the artist's team: read without an account, never with a budget.
 */
export function ShareButton({
  projectId,
  documentId,
}: {
  projectId: string;
  documentId: string;
}) {
  const t = fr.strategyReleasePlan.preview;
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const result = await shareReleasePlan(projectId, documentId);
          if (!result.ok) return void toast.error(t.shareFailed);
          try {
            await navigator.clipboard.writeText(result.url);
            toast.success(t.shared);
          } catch {
            toast.message(result.url);
          }
        })
      }
    >
      {pending ? t.sharing : t.share}
    </Button>
  );
}
