import Link from "next/link";

import { AssistantProvider } from "@/components/assistant/assistant-provider";
import { AccessWatcher } from "@/components/auth/access-watcher";
import { FeedbackProvider } from "@/components/feedback/feedback-provider";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { NotificationListener } from "@/components/notifications/notification-listener";
import { OnboardingProvider } from "@/components/onboarding/onboarding-provider";
import { PreprodSlot } from "@/components/preprod/preprod-slot";
import { MobileNav } from "@/components/shell/mobile-nav";
import { PdsLogo } from "@/components/shell/pds-logo";
import { Sidebar } from "@/components/shell/sidebar";
import { CollapsedNavProvider } from "@/components/shell/use-collapsed-nav";
import { UserPanel } from "@/components/shell/user-panel";
import { NavigationProgress } from "@/components/ui/navigation-progress";
import { OneTimeLinksProvider } from "@/components/ui/one-time-links";
import { can } from "@/lib/auth/access";
import { getAccess } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { getPublicEnv } from "@/lib/env-public";
import { welcomeVariantOf } from "@/lib/home/welcome";
import { fr } from "@/lib/i18n/fr";
import { countPendingMemberships } from "@/lib/members/queries";
import { loadNotifications } from "@/lib/notifications/queries";

type Notifications = Awaited<ReturnType<typeof loadNotifications>>;

// The bell and the navigation wait for their own reads, never the page: the
// layout no longer awaits them before its content starts rendering (page
// loads audit, 27/10/2026), they are read alongside it.
async function AppBell({
  notifications,
  ...props
}: Omit<
  React.ComponentProps<typeof NotificationBell>,
  "items" | "unreadCount" | "requestCount"
> & {
  notifications: Promise<Notifications>;
}) {
  const { items, unreadCount, requestCount } = await notifications;
  return (
    <NotificationBell
      items={items}
      unreadCount={unreadCount}
      requestCount={requestCount}
      {...props}
    />
  );
}

async function CountedSidebar({
  pending,
  ...props
}: Omit<React.ComponentProps<typeof Sidebar>, "pendingMembers"> & {
  pending: Promise<number>;
}) {
  return <Sidebar pendingMembers={await pending} {...props} />;
}

async function CountedMobileNav({
  pending,
  ...props
}: Omit<React.ComponentProps<typeof MobileNav>, "pendingMembers"> & {
  pending: Promise<number>;
}) {
  return <MobileNav pendingMembers={await pending} {...props} />;
}

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
  const notifications = signedIn
    ? loadNotifications()
    : Promise.resolve({ items: [], unreadCount: 0, requestCount: 0 });
  const pendingMembers =
    isAdmin && access.organizationId
      ? countPendingMemberships(access.organizationId)
      : Promise.resolve(0);
  const vapidPublicKey = getPublicEnv().NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null;
  const bell = (variant: "nav" | "ghost") =>
    signedIn ? (
      <AppBell
        notifications={notifications}
        vapidPublicKey={vapidPublicKey}
        side={variant === "nav" ? "right" : "bottom"}
        variant={variant}
      />
    ) : null;

  const brand = (
    <Link href={routes.app} aria-label={fr.shell.brand}>
      <PdsLogo entryLanding className="w-8" />
    </Link>
  );

  return (
    <FeedbackProvider
      organizationId={signedIn ? access.organizationId : null}
      personId={signedIn ? access.personId : null}
      direct={signedIn && can(access, "read_feedback")}
    >
      <OnboardingProvider
        profile={
          signedIn
            ? {
                variant: welcomeVariantOf(access),
                firstName: access.firstName,
                name,
                roleLabel: access.role
                  ? fr.auth.members.roles[access.role]
                  : null,
                pushKey: vapidPublicKey,
              }
            : null
        }
      >
        <AssistantProvider launcher={signedIn}>
          <CollapsedNavProvider>
            <OneTimeLinksProvider>
              <div className="flex flex-1 bg-[var(--surface-app)] md:p-[var(--shell-inset)]">
                <NavigationProgress />
                <AccessWatcher
                  current={access.state}
                  role={access.role}
                  intervalMs={60_000}
                />
                {signedIn && access.personId && (
                  <NotificationListener personId={access.personId} />
                )}

                <CountedSidebar
                  isAdmin={isAdmin}
                  permissions={access.permissions}
                  pending={pendingMembers}
                  bell={bell("nav")}
                  name={name}
                  email={access.email}
                />

                <div className="flex min-w-0 flex-1 flex-col">
                  <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b border-[color:var(--border-hairline)] bg-background px-2 md:hidden">
                    <CountedMobileNav
                      isAdmin={isAdmin}
                      permissions={access.permissions}
                      pending={pendingMembers}
                      footer={userPanel}
                    />
                    {brand}
                    <div className="ml-auto">{bell("ghost")}</div>
                  </header>
                  <main className="flex min-w-0 flex-1 flex-col">
                    {children}
                  </main>
                </div>
                {signedIn && <PreprodSlot email={access.email} />}
              </div>
            </OneTimeLinksProvider>
          </CollapsedNavProvider>
        </AssistantProvider>
      </OnboardingProvider>
    </FeedbackProvider>
  );
}
