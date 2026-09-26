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

// Authenticated shell: sidebar on desktop, drawer on mobile.
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
  const bell = (onDark: boolean) =>
    signedIn ? (
      <NotificationBell
        items={notifications.items}
        unreadCount={notifications.unreadCount}
        vapidPublicKey={vapidPublicKey}
        onDark={onDark}
      />
    ) : null;

  // Links are ink by default (globals.css): the brand sets its colour per background.
  const brand = (onDark: boolean) => (
    <Link
      href={routes.app}
      className={`flex flex-col px-3 no-underline ${onDark ? "text-[color:var(--nav-fg)]" : "text-foreground"}`}
    >
      <span className="font-heading text-display-sm">{fr.app.name}</span>
      {onDark && (
        <span className="text-caption text-[color:var(--nav-fg-muted)]">
          {fr.shell.brandSubtitle}
        </span>
      )}
    </Link>
  );

  return (
    <div className="flex flex-1">
      <AccessWatcher
        current={access.state}
        role={access.role}
        intervalMs={60_000}
      />
      {signedIn && access.personId && (
        <NotificationListener personId={access.personId} />
      )}

      <aside className="sticky top-0 hidden h-dvh w-[var(--nav-width)] shrink-0 flex-col justify-between gap-6 overflow-y-auto bg-sidebar py-5 text-sidebar-foreground md:flex">
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-2 pr-2">
            {brand(true)}
            {bell(true)}
          </div>
          <NavLinks isAdmin={isAdmin} />
        </div>
        {userPanel}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-14 items-center gap-1 border-b border-[color:var(--border-hairline)] bg-background px-2 md:hidden">
          <MobileNav isAdmin={isAdmin} footer={userPanel} />
          {brand(false)}
          <div className="ml-auto">{bell(false)}</div>
        </header>
        <main className="flex min-w-0 flex-1 flex-col">{children}</main>
      </div>
    </div>
  );
}
