import type { ReactNode } from "react";

import { ToneCallout } from "@/components/ui/tone-callout";
import { framingGuide } from "@/lib/i18n/fr/framing-guide";

const fr = { framingGuide };

/**
 * What PO says at the head of a step (proto `poBox`: `.callout.info` and
 * the « PO » badge): a proposal to read, never a decision.
 */
export function PoCallout({ children }: { children: ReactNode }) {
  return (
    <ToneCallout
      tone="info"
      as="div"
      icon={
        <span
          aria-hidden
          className="inline-flex h-5 shrink-0 items-center rounded-md bg-card px-1.5 text-[length:var(--type-micro)] leading-[var(--type-micro-lh)] font-semibold text-foreground"
        >
          {fr.framingGuide.poBadge}
        </span>
      }
    >
      {children}
    </ToneCallout>
  );
}
