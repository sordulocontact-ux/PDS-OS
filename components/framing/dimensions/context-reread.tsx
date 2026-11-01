"use client";

import { Button } from "@/components/ui/button";
import { ToneCallout } from "@/components/ui/tone-callout";
import { useFramingAction } from "@/components/framing/use-framing-action";
import { rereadFramingContext } from "@/lib/framing/actions/start";
import { framingJourney } from "@/lib/i18n/fr/framing-journey";

const fr = { framingJourney };

/**
 * PO's reading of the initial context failed at « Commencer le cadrage »:
 * the Cadrage goes on, and its proposals can still come (never typed
 * again).
 */
export function ContextReread({ projectId }: { projectId: string }) {
  const t = fr.framingJourney.dimensions;
  const { pending, run } = useFramingAction();
  return (
    <ToneCallout
      tone="warning"
      as="div"
      contentClassName="flex flex-wrap items-center justify-between gap-x-4 gap-y-2"
    >
      <span>{t.contextUnread}</span>
      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        aria-busy={pending || undefined}
        onClick={() => run(() => rereadFramingContext(projectId))}
      >
        {pending ? t.rereading : t.reread}
      </Button>
    </ToneCallout>
  );
}
