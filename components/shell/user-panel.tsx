import { SignOutButton } from "@/components/auth/sign-out-button";
import { FeedbackNavButton } from "@/components/shell/feedback-nav-button";
import { ThemeChips } from "@/components/shell/theme-chips";

// Bottom of the navigation: who is signed in, feedback about the app, the
// theme, and the way out. Both take the shape of a navigation item (nav-item.ts).
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
      <ThemeChips />
      <SignOutButton
        variant="ghost"
        className="h-10 w-full justify-start gap-2 rounded-lg px-4 text-[length:var(--type-body-md)] leading-[var(--type-body-md-lh)] text-[color:var(--nav-fg)] hover:bg-[var(--nav-item-hover-bg)] active:bg-[var(--nav-item-active-bg)] [&_svg:not([class*='size-'])]:size-5"
      />
    </div>
  );
}
