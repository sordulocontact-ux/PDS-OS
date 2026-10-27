"use client";

import { Button } from "@/components/ui/button";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { strategyBriefOut } from "@/lib/i18n/fr/strategy-brief-out";
import { remindBriefReviewer } from "@/lib/strategy/actions/brief-out";

const fr = { strategyBriefOut };

/** « Relancer <Nom> » (proto strelance): a notification, 12 hours apart. */
export function RemindReviewer({
  projectId,
  reviewId,
  name,
}: {
  projectId: string;
  reviewId: string;
  name: string;
}) {
  const t = fr.strategyBriefOut.validation;
  const { pending, error, run } = useWriteSubmit(
    () => undefined,
    t.reminded(name),
  );
  return (
    <span className="flex flex-col gap-1">
      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => run(() => remindBriefReviewer(projectId, reviewId))}
      >
        {t.remind(name)}
      </Button>
      {error && <span className="text-xs font-medium text-error">{error}</span>}
    </span>
  );
}
