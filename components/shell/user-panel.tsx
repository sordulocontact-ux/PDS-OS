import { IconGauge3 } from "nucleo-sharp-essential";
import Link from "next/link";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { ReplayOnboardingButton } from "@/components/onboarding/replay-onboarding-button";
import { FeedbackNavButton } from "@/components/shell/feedback-nav-button";
import { navItemClass } from "@/components/shell/nav-item";
import { ThemeChips } from "@/components/shell/theme-chips";
import { routes } from "@/lib/auth/redirects";
import { aiUsage } from "@/lib/i18n/fr/ai-usage";

const fr = { aiUsage };

// Bottom of the navigation: who is signed in, feedback about the app, the
// settings (requests to PO of the day), the theme, and the way out. Both take the shape of a navigation item (nav-item.ts).
export function UserPanel({
  name,
  email,
}: {
  name: string;
  email: string | null;
}) {
  return (
    <div className="flex flex-col gap-2 border-t border-sidebar-border pt-3">
      <div className="min-w-0 px-4">
        {name && <p className="truncate text-body-md font-medium">{name}</p>}
        {email && (
          <p className="truncate text-caption text-[color:var(--nav-fg-muted)]">
            {email}
          </p>
        )}
      </div>
      <FeedbackNavButton />
      <ReplayOnboardingButton />
      <Link href={routes.settings} data-close-nav className={navItemClass}>
        <IconGauge3 className="size-5 shrink-0 modern:size-4" aria-hidden />
        {fr.aiUsage.settings.navLink}
      </Link>
      <ThemeChips />
      <SignOutButton
        variant="ghost"
        className="h-10 w-full justify-start gap-2 rounded-lg px-4 text-[length:var(--type-body-md)] leading-[var(--type-body-md-lh)] text-[color:var(--nav-fg)] hover:bg-[var(--nav-item-hover-bg)] active:bg-[var(--nav-item-active-bg)] modern:px-3 modern:text-[length:var(--type-body-sm)] modern:leading-[var(--type-body-sm-lh)] [&_svg:not([class*='size-'])]:size-5 modern:[&_svg:not([class*='size-'])]:size-4"
      />
    </div>
  );
}
