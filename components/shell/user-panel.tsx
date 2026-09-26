import { SignOutButton } from "@/components/auth/sign-out-button";

// Bottom of the navigation: who is signed in, and the way out.
export function UserPanel({
  name,
  email,
}: {
  name: string;
  email: string | null;
}) {
  return (
    <div className="flex flex-col gap-2 border-t border-sidebar-border pt-3">
      <div className="min-w-0 px-3">
        {name && <p className="truncate text-body-sm font-medium">{name}</p>}
        {email && (
          <p className="truncate text-caption text-[color:var(--nav-fg-muted)]">
            {email}
          </p>
        )}
      </div>
      <SignOutButton
        variant="ghost"
        className="w-full justify-start rounded-none px-3 text-[color:var(--nav-fg-muted)] hover:bg-[var(--nav-item-hover-bg)] hover:text-[color:var(--nav-fg)] active:bg-[var(--nav-item-active-bg)]"
      />
    </div>
  );
}
