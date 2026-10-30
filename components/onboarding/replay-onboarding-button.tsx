"use client";

import { IconPlay } from "@/components/icons";
import { useOnboarding } from "@/components/onboarding/onboarding-provider";
import { navItemClass } from "@/components/shell/nav-item";
import { onboarding } from "@/lib/i18n/fr/onboarding";
import { cn } from "@/lib/utils";

const fr = { onboarding };

// "Revoir la présentation", in the mobile drawer's user panel. `data-close-nav`
// closes the drawer first.
export function ReplayOnboardingButton() {
  const presentation = useOnboarding();
  if (!presentation) return null;
  return (
    <button
      type="button"
      data-close-nav
      onClick={presentation.replay}
      className={cn(navItemClass, "w-full cursor-pointer text-left")}
    >
      <IconPlay className="size-5 shrink-0" aria-hidden />
      {fr.onboarding.replay}
    </button>
  );
}
