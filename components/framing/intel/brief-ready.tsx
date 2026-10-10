"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { FramingStepCard } from "@/components/framing/guide/step-card";
import { useFramingAction } from "@/components/framing/use-framing-action";
import { Button } from "@/components/ui/button";
import { generateBrief } from "@/lib/framing/actions/brief-versions";
import { fr } from "@/lib/i18n/fr";

export type Remaining = { key: string; label: string; href: string };

/**
 * The end of the Cadrage: what still blocks the Brief, or « Créer le
 * Brief » once every required answer is known and nothing waits to be
 * confirmed (decided by code, lib/framing/assess.ts).
 */
export function BriefReady({
  projectId,
  remaining,
  optional,
  editable,
  hasBrief,
  briefHref,
}: {
  projectId: string;
  remaining: Remaining[];
  // Optional questions still empty: the Brief can be created, but the
  // Cadrage is not « complet » (UX test of 09/10/2026: « complet » at 21/23).
  optional: Remaining[];
  editable: boolean;
  // A version exists already: the button updates it.
  hasBrief: boolean;
  briefHref: string;
}) {
  const t = fr.framingIntel.guide;
  const router = useRouter();
  const { pending, run } = useFramingAction();
  const ready = remaining.length === 0;

  return (
    <FramingStepCard
      eyebrow={t.briefNav}
      title={
        !ready
          ? t.remainingTitle
          : optional.length > 0
            ? t.readyTitle
            : t.doneTitle
      }
      description={
        !ready
          ? t.remaining(remaining.length)
          : optional.length > 0
            ? t.readyBody(optional.length)
            : t.doneBody
      }
      actions={
        ready &&
        editable && (
          <Button
            size="lg"
            disabled={pending}
            onClick={() =>
              run(
                () => generateBrief(projectId),
                () => router.push(briefHref),
              )
            }
          >
            {pending ? t.generating : hasBrief ? t.update : t.generate}
          </Button>
        )
      }
    >
      {(!ready || optional.length > 0) && (
        <ul className="flex flex-col gap-1">
          {(ready ? optional : remaining).map((item) => (
            <li key={item.key}>
              <Link
                href={item.href}
                className="-mx-3 flex rounded-lg px-3 py-2 text-body-md font-medium hover:bg-[var(--control-bg-hover)]"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </FramingStepCard>
  );
}
