import Link from "next/link";

import { AccessWatcher } from "@/components/auth/access-watcher";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { NotificationListener } from "@/components/notifications/notification-listener";
import { MobileNav } from "@/components/shell/mobile-nav";
import { NavLinks } from "@/components/shell/nav-links";
import { UserPanel } from "@/components/shell/user-panel";
import { can } from "@/lib/auth/access";
import { getAccess } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { getPublicEnv } from "@/lib/env-public";
import { fr } from "@/lib/i18n/fr";
import { loadNotifications } from "@/lib/notifications/queries";

// Authenticated shell: floating sidebar on desktop, drawer on mobile.
// Display only. Access is enforced by each page (lib/auth/dal.ts), because a
// layout does not re-run on client navigation.
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const access = await getAccess();
  const isAdmin = access.state === "approved" && can(access, "administer");
  const name = [access.firstName, access.lastName].filter(Boolean).join(" ");
  const userPanel = <UserPanel name={name} email={access.email} />;
  const signedIn = access.state === "approved" && access.personId !== null;
  const notifications = signedIn
    ? await loadNotifications()
    : { items: [], unreadCount: 0 };
  const vapidPublicKey = getPublicEnv().NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null;
  const bell = (side: "right" | "bottom") =>
    signedIn ? (
      <NotificationBell
        items={notifications.items}
        unreadCount={notifications.unreadCount}
        vapidPublicKey={vapidPublicKey}
        side={side}
      />
    ) : null;

  // Trimmed to its cap height as in the Figma, so the navigation starts 24 px
  // below the letters, not below the line box.
  const brand = (
    <Link
      href={routes.app}
      className="text-base font-bold no-underline [text-box:trim-both_cap_alphabetic]"
    >
      {fr.shell.brand}
    </Link>
  );

  return (
    <div className="flex flex-1 bg-[var(--surface-app)] md:p-[var(--shell-inset)]">
      <AccessWatcher
        current={access.state}
        role={access.role}
        intervalMs={60_000}
      />
      {signedIn && access.personId && (
        <NotificationListener personId={access.personId} />
      )}

      <aside className="sticky top-[var(--shell-inset)] hidden h-[calc(100dvh-2*var(--shell-inset))] w-[var(--nav-width)] shrink-0 flex-col justify-between gap-6 overflow-y-auto rounded-3xl bg-sidebar px-6 py-4 text-sidebar-foreground md:flex">
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between gap-2">
            {brand}
            {/* Centred on the brand without making the row taller. */}
            <div className="-my-3.5">{bell("right")}</div>
          </div>
          <NavLinks isAdmin={isAdmin} />
        </div>
        {userPanel}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b border-[color:var(--border-hairline)] bg-background px-2 md:hidden">
          <MobileNav isAdmin={isAdmin} footer={userPanel} />
          {brand}
          <div className="ml-auto">{bell("bottom")}</div>
        </header>
        <main className="flex min-w-0 flex-1 flex-col">{children}</main>
      </div>
    </div>
  );
}
