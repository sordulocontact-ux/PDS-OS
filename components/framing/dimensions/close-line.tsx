"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { buttonVariants, ButtonRoll } from "@/components/ui/button";
import { ViewLink } from "@/components/ui/view-link";
import { framingJourney } from "@/lib/i18n/fr/framing-journey";

const fr = { framingJourney };

/**
 * « Fermer » on the right of a line opened in place (Sacha 09/11/2026), and
 * Échap anywhere on the page, unless a dialog or a menu is open above: the
 * line closes, the page does not move.
 */
export function CloseLine({ href }: { href: string }) {
  const router = useRouter();
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      if (document.querySelector('[role="dialog"], [role="menu"]')) return;
      router.replace(href, { scroll: false });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [href, router]);
  return (
    <ViewLink
      href={href}
      scroll={false}
      replace
      className={buttonVariants({ variant: "outline", size: "sm" })}
    >
      <ButtonRoll>{fr.framingJourney.dimensions.close}</ButtonRoll>
    </ViewLink>
  );
}
