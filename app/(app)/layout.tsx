import Link from "next/link";

import { AssistantProvider } from "@/components/assistant/assistant-provider";
import { AccessWatcher } from "@/components/auth/access-watcher";
import { FeedbackProvider } from "@/components/feedback/feedback-provider";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { NotificationListener } from "@/components/notifications/notification-listener";
import { PreprodSlot } from "@/components/preprod/preprod-slot";
import { MobileNav } from "@/components/shell/mobile-nav";
import { Sidebar } from "@/components/shell/sidebar";
import { CollapsedNavProvider } from "@/components/shell/use-collapsed-nav";
import { UserPanel } from "@/components/shell/user-panel";
import { OneTimeLinksProvider } from "@/components/ui/one-time-links";
import { can } from "@/lib/auth/access";
import { getAccess } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { getPublicEnv } from "@/lib/env-public";
import { fr } from "@/lib/i18n/fr";
import { countPendingMemberships } from "@/lib/members/queries";
import { loadNotifications } from "@/lib/notifications/queries";

// Authenticated shell: sidebar against the screen's edge on desktop, drawer on
// mobile.
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
  // Access requests waiting for a decision: counted on "Équipe" for admins.
  const [notifications, pendingMembers] = await Promise.all([
    signedIn ? loadNotifications() : { items: [], unreadCount: 0 },
    isAdmin && access.organizationId
      ? countPendingMemberships(access.organizationId)
      : 0,
  ]);
  const vapidPublicKey = getPublicEnv().NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null;
  const bell = (variant: "nav" | "ghost") =>
    signedIn ? (
      <NotificationBell
        items={notifications.items}
        unreadCount={notifications.unreadCount}
        vapidPublicKey={vapidPublicKey}
        side={variant === "nav" ? "right" : "bottom"}
        variant={variant}
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
    <FeedbackProvider
      organizationId={signedIn ? access.organizationId : null}
      personId={signedIn ? access.personId : null}
      direct={signedIn && can(access, "read_feedback")}
    >
      <AssistantProvider launcher={signedIn}>
        <CollapsedNavProvider>
          <OneTimeLinksProvider>
            <div className="flex flex-1 bg-[var(--surface-app)] md:p-[var(--shell-inset)]">
              <AccessWatcher
                current={access.state}
                role={access.role}
                intervalMs={60_000}
              />
              {signedIn && access.personId && (
                <NotificationListener personId={access.personId} />
              )}

              <Sidebar
                isAdmin={isAdmin}
                pendingMembers={pendingMembers}
                bell={bell("nav")}
                name={name}
                email={access.email}
              />

              <div className="flex min-w-0 flex-1 flex-col">
                <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b border-[color:var(--border-hairline)] bg-background px-2 md:hidden">
                  <MobileNav
                    isAdmin={isAdmin}
                    pendingMembers={pendingMembers}
                    footer={userPanel}
                  />
                  {brand}
                  <div className="ml-auto">{bell("ghost")}</div>
                </header>
                <main className="flex min-w-0 flex-1 flex-col">{children}</main>
              </div>
              {signedIn && <PreprodSlot email={access.email} />}
            </div>
          </OneTimeLinksProvider>
        </CollapsedNavProvider>
      </AssistantProvider>
    </FeedbackProvider>
  );
}
